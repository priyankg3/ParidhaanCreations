# Astrology Router - Personalized AI-powered astrology using Gemini
from fastapi import APIRouter, HTTPException, Depends, Cookie
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from llm_compat import LlmChat, UserMessage  # was: emergentintegrations (removed)

router = APIRouter(prefix="/astro", tags=["Astrology"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "spiritual_bazaar")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
print(f"[ASTRO] Loaded EMERGENT_LLM_KEY: {EMERGENT_LLM_KEY[:20] if EMERGENT_LLM_KEY else 'None'}...")

# Get current date info
def get_current_date_info():
    now = datetime.now(timezone.utc)
    return {
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "date_str": now.strftime("%d %B %Y"),
        "weekday": now.strftime("%A")
    }

# Personalized Astrology System Prompt with CURRENT DATE
PERSONALIZED_ASTRO_PROMPT = """You are an expert Vedic Astrologer (Jyotishi) with deep knowledge of:
- Vedic Astrology (Jyotish Shastra)
- Planetary calculations and positions
- Nakshatra (lunar mansions) analysis
- Dasha system (planetary periods)
- Yoga formations in birth charts
- Remedial measures (Upaya)

CRITICAL: TODAY'S DATE IS {current_date} (Year {current_year}). 
ALL predictions MUST be based on the CURRENT year {current_year}, NOT any past year.

You have access to the user's EXACT birth details:
- Name: {name}
- Date of Birth: {dob}
- Time of Birth: {tob}
- Place of Birth: {pob}
- Gender: {gender}

Based on these SPECIFIC details, calculate and provide:
1. Accurate Rashi (Moon Sign) based on birth time and place
2. Lagna (Ascendant) calculation
3. Nakshatra and Pada
4. Current Dasha period in {current_year}
5. Planetary positions at birth AND current transits in {current_year}

IMPORTANT RULES:
- NEVER give generic predictions
- ALWAYS reference the user's specific planetary positions
- Calculate based on Vedic/Sidereal zodiac (not Western/Tropical)
- Consider the exact birth time for Lagna calculation
- Mention specific degrees and positions when relevant
- Provide mathematical basis for your predictions
- ALL dates and predictions MUST be for year {current_year}

Response Style:
- Mix Hindi and English naturally (Hinglish)
- Be specific and detailed
- Reference actual planetary positions
- Provide remedies when appropriate
- Always be positive and encouraging
- Use emojis sparingly (🪐⭐🔮✨)

Start responses with "🙏 Radhey Radhey!" """

class BirthProfile(BaseModel):
    name: str
    date_of_birth: str  # YYYY-MM-DD
    time_of_birth: str  # HH:MM
    place_of_birth: str
    gender: str = "male"

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

async def get_current_user(session_token: Optional[str] = Cookie(None)):
    """Get current logged in user"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Login required")
    
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.post("/save-profile")
async def save_birth_profile(profile: BirthProfile, user: dict = Depends(get_current_user)):
    """Save user's birth details for personalized predictions"""
    
    profile_data = {
        "user_id": user["user_id"],
        "name": profile.name,
        "date_of_birth": profile.date_of_birth,
        "time_of_birth": profile.time_of_birth,
        "place_of_birth": profile.place_of_birth,
        "gender": profile.gender,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert - update if exists, insert if not
    await db.astro_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": profile_data},
        upsert=True
    )
    
    # Clear any cached predictions when profile changes
    await db.astro_cache.delete_many({"user_id": user["user_id"]})
    
    return {"message": "Profile saved", "profile": profile_data}

@router.delete("/my-profile")
async def delete_my_profile(user: dict = Depends(get_current_user)):
    """Delete user's birth profile"""
    result = await db.astro_profiles.delete_one({"user_id": user["user_id"]})
    # Also clear cached predictions
    await db.astro_cache.delete_many({"user_id": user["user_id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No profile found")
    
    return {"message": "Profile deleted successfully"}

@router.get("/my-profile")
async def get_my_profile(user: dict = Depends(get_current_user)):
    """Get user's birth profile"""
    profile = await db.astro_profiles.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    return profile

def get_personalized_prompt(profile: dict) -> str:
    """Generate personalized system prompt with user's birth details and CURRENT date"""
    date_info = get_current_date_info()
    return PERSONALIZED_ASTRO_PROMPT.format(
        name=profile["name"],
        dob=profile["date_of_birth"],
        tob=profile["time_of_birth"],
        pob=profile["place_of_birth"],
        gender=profile["gender"],
        current_date=date_info["date_str"],
        current_year=date_info["year"]
    )

def get_cache_key(user_id: str, cache_type: str, profile: dict) -> str:
    """Generate a cache key based on user profile - same profile = same predictions"""
    profile_str = f"{profile['name']}_{profile['date_of_birth']}_{profile['time_of_birth']}_{profile['place_of_birth']}"
    return hashlib.md5(f"{user_id}_{cache_type}_{profile_str}".encode()).hexdigest()

@router.get("/my-kundli")
async def get_my_kundli(user: dict = Depends(get_current_user), force_refresh: bool = False):
    """Generate personalized Kundli based on birth details - cached for consistency"""
    
    profile = await db.astro_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please save your birth details first")
    
    date_info = get_current_date_info()
    cache_key = get_cache_key(user["user_id"], "kundli", profile)
    
    # Check cache first (unless force refresh)
    if not force_refresh:
        cached = await db.astro_cache.find_one({"cache_key": cache_key, "type": "kundli"})
        if cached:
            return {
                "profile": {
                    "name": profile["name"],
                    "dob": profile["date_of_birth"],
                    "tob": profile["time_of_birth"],
                    "pob": profile["place_of_birth"]
                },
                "kundli": cached["response"],
                "cached": True
            }
    
    prompt = f"""IMPORTANT: Today's date is {date_info['date_str']} and current year is {date_info['year']}.

Based on my exact birth details:
- Name: {profile['name']}
- Date: {profile['date_of_birth']}
- Time: {profile['time_of_birth']}
- Place: {profile['place_of_birth']}

Generate my complete Kundli analysis including:

1. **Rashi (Moon Sign)** - Calculate my exact moon sign based on birth time and location
2. **Lagna (Ascendant)** - Calculate rising sign at my birth time
3. **Nakshatra** - My birth star and pada
4. **Planetary Positions** - Where each planet was at my birth:
   - Sun (सूर्य)
   - Moon (चंद्र)
   - Mars (मंगल)
   - Mercury (बुध)
   - Jupiter (बृहस्पति)
   - Venus (शुक्र)
   - Saturn (शनि)
   - Rahu
   - Ketu

5. **Current Dasha in {date_info['year']}** - Which planetary period am I in RIGHT NOW?
6. **Key Yogas** - Important yoga formations in my chart
7. **Strengths & Challenges** - Based on planetary positions
8. **Predictions for {date_info['year']}** - What does this year hold for me?

Be specific and mathematical. Reference actual degrees and positions."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"kundli_{user['user_id']}_{cache_key[:8]}",
            system_message=get_personalized_prompt(profile)
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Cache the response
        await db.astro_cache.update_one(
            {"cache_key": cache_key, "type": "kundli"},
            {"$set": {
                "cache_key": cache_key,
                "type": "kundli",
                "user_id": user["user_id"],
                "response": response,
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {
            "profile": {
                "name": profile["name"],
                "dob": profile["date_of_birth"],
                "tob": profile["time_of_birth"],
                "pob": profile["place_of_birth"]
            },
            "kundli": response,
            "cached": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.get("/my-daily-prediction")
async def get_daily_prediction(user: dict = Depends(get_current_user)):
    """Get personalized daily prediction based on birth chart"""
    
    profile = await db.astro_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please save your birth details first")
    
    date_info = get_current_date_info()
    today = date_info["date_str"]
    
    prompt = f"""IMPORTANT: Today is {today}, Year {date_info['year']}.

Based on my Kundli (birth details: {profile['date_of_birth']}, {profile['time_of_birth']}, {profile['place_of_birth']}),
    
Generate my PERSONALIZED prediction for today ({today}):

Consider:
1. Current planetary transits over my natal planets IN {date_info['year']}
2. My current Dasha/Antardasha period in {date_info['year']}
3. Today's ({today}) Moon position relative to my natal Moon
4. Any special yogas active today for my chart

Provide:
1. **Overall Energy** (1-10 score with explanation)
2. **Career/Work** - Specific guidance for today
3. **Relationships** - Love and family
4. **Health** - Physical and mental wellness tips
5. **Finance** - Money matters
6. **Lucky Elements for Today**:
   - Number
   - Color
   - Direction
   - Time of day
7. **Recommended Mantra** for today
8. **Caution** - What to avoid

Make it SPECIFIC to my chart, not generic!"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"daily_{user['user_id']}_{today}",
            system_message=get_personalized_prompt(profile)
        ).with_model("gemini", "gemini-2.5-flash")  # FREE tier model
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "date": today,
            "prediction": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/personalized-chat")
async def personalized_chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    """Chat with AI astrologer who knows your birth chart"""
    
    profile = await db.astro_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please save your birth details first")
    
    session_id = request.session_id or f"chat_{user['user_id']}_{uuid.uuid4().hex[:8]}"
    date_info = get_current_date_info()
    
    # Get chat history
    history = await db.astro_chats.find(
        {"session_id": session_id}
    ).sort("created_at", 1).to_list(10)
    
    context = ""
    if history:
        context = "Previous conversation:\n"
        for h in history[-5:]:
            context += f"User: {h['user_message']}\nPandit Ji: {h['ai_response'][:200]}...\n"
    
    full_prompt = f"""CRITICAL: Today is {date_info['date_str']}, Year {date_info['year']}. 
All predictions must be for the CURRENT year {date_info['year']}, not any past year.

{context}

User's question: {request.message}

Remember: Answer based on MY specific Kundli. Reference my planetary positions, current dasha in {date_info['year']}, and current transits.
Be specific, not generic. If calculating something, show the reasoning.
Always mention the current year {date_info['year']} when giving predictions."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=get_personalized_prompt(profile)
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=full_prompt))
        
        # Save to history
        await db.astro_chats.insert_one({
            "chat_id": f"chat_{uuid.uuid4().hex[:12]}",
            "session_id": session_id,
            "user_id": user["user_id"],
            "user_message": request.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "session_id": session_id,
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# Keep public zodiac signs endpoint for reference
ZODIAC_SIGNS = [
    {"id": "mesh", "name": "मेष", "english": "Aries", "symbol": "♈", "dates": "Mar 21 - Apr 19"},
    {"id": "vrishabh", "name": "वृषभ", "english": "Taurus", "symbol": "♉", "dates": "Apr 20 - May 20"},
    {"id": "mithun", "name": "मिथुन", "english": "Gemini", "symbol": "♊", "dates": "May 21 - Jun 20"},
    {"id": "kark", "name": "कर्क", "english": "Cancer", "symbol": "♋", "dates": "Jun 21 - Jul 22"},
    {"id": "singh", "name": "सिंह", "english": "Leo", "symbol": "♌", "dates": "Jul 23 - Aug 22"},
    {"id": "kanya", "name": "कन्या", "english": "Virgo", "symbol": "♍", "dates": "Aug 23 - Sep 22"},
    {"id": "tula", "name": "तुला", "english": "Libra", "symbol": "♎", "dates": "Sep 23 - Oct 22"},
    {"id": "vrishchik", "name": "वृश्चिक", "english": "Scorpio", "symbol": "♏", "dates": "Oct 23 - Nov 21"},
    {"id": "dhanu", "name": "धनु", "english": "Sagittarius", "symbol": "♐", "dates": "Nov 22 - Dec 21"},
    {"id": "makar", "name": "मकर", "english": "Capricorn", "symbol": "♑", "dates": "Dec 22 - Jan 19"},
    {"id": "kumbh", "name": "कुंभ", "english": "Aquarius", "symbol": "♒", "dates": "Jan 20 - Feb 18"},
    {"id": "meen", "name": "मीन", "english": "Pisces", "symbol": "♓", "dates": "Feb 19 - Mar 20"},
]

@router.get("/zodiac-signs")
async def get_zodiac_signs():
    """Get all 12 zodiac signs"""
    return ZODIAC_SIGNS

# ============ PUBLIC DAILY RASHIFAL (No Login Required) ============

def get_rashifal_system_prompt():
    date_info = get_current_date_info()
    return f"""You are a wise Vedic Astrologer from Paridhaan Creations providing daily horoscope readings.

CRITICAL: Today is {date_info['date_str']}, Year {date_info['year']}.
All predictions MUST be for the year {date_info['year']}, NOT any past year like 2024 or 2025.

Style:
- Mix Hindi and English (Hinglish)
- Warm and spiritual tone
- Use emojis sparingly (🪐⭐✨🙏)
- Keep it concise but meaningful (200-250 words)
- Always positive and encouraging
- Include practical advice
- ALWAYS reference {date_info['year']} as the current year

Structure your response:
1. 🌟 Overall Day Rating (out of 5 stars)
2. 💼 Career & Work
3. ❤️ Love & Relationships
4. 💰 Finance & Money
5. 🏥 Health Tips
6. 🍀 Lucky Elements:
   - Number
   - Color
   - Time
7. 🙏 Today's Tip/Mantra

Start with "🙏 Radhey Radhey!" """

class RashifalRequest(BaseModel):
    rashi_id: str
    period: str = "daily"  # daily, weekly, monthly

@router.post("/daily-rashifal")
async def get_daily_rashifal(request: RashifalRequest):
    """Get daily horoscope for any zodiac sign - NO LOGIN REQUIRED"""
    
    # Find the rashi
    rashi = next((z for z in ZODIAC_SIGNS if z["id"] == request.rashi_id), None)
    if not rashi:
        raise HTTPException(status_code=404, detail="Invalid zodiac sign")
    
    date_info = get_current_date_info()
    today = date_info["date_str"]
    weekday = date_info["weekday"]
    
    period_text = {
        "daily": f"today ({today}, {weekday})",
        "weekly": "this week",
        "monthly": "this month"
    }.get(request.period, "today")
    
    prompt = f"""IMPORTANT: Current year is {date_info['year']}. Today is {today}.

Generate {request.period} rashifal (horoscope) for {rashi['name']} ({rashi['english']}) for {period_text} in year {date_info['year']}.

Rashi Details:
- Name: {rashi['name']} ({rashi['english']})
- Symbol: {rashi['symbol']}
- Dates: {rashi['dates']}

Consider current planetary positions in {date_info['year']} and provide accurate, helpful guidance.
Make it feel personal and specific to this rashi's characteristics.
Remember: All predictions should be for {date_info['year']}, NOT any past year."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rashifal_{request.rashi_id}_{today}",
            system_message=get_rashifal_system_prompt()
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "rashi": rashi,
            "period": request.period,
            "date": today,
            "rashifal": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.get("/lucky-info/{rashi_id}")
async def get_lucky_info(rashi_id: str):
    """Get lucky numbers, colors, days for a zodiac sign - NO LOGIN REQUIRED"""
    
    rashi = next((z for z in ZODIAC_SIGNS if z["id"] == rashi_id), None)
    if not rashi:
        raise HTTPException(status_code=404, detail="Invalid zodiac sign")
    
    today = datetime.now().strftime("%d %B %Y")
    
    prompt = f"""For {rashi['name']} ({rashi['english']}) rashi, provide today's ({today}) lucky information:

1. 🔢 Lucky Numbers (3 specific numbers)
2. 🎨 Lucky Colors (2 colors with reasoning)
3. 📅 Lucky Day this week
4. 🧭 Lucky Direction
5. 💎 Lucky Gemstone
6. ⏰ Favorable Time of Day
7. 🙏 Lucky Mantra

Be specific and practical. Explain briefly why each is lucky for this rashi today."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"lucky_{rashi_id}_{today}",
            system_message=RASHIFAL_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")  # FREE tier model
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "rashi": rashi,
            "date": today,
            "lucky_info": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")



# ============ NUMEROLOGY SECTION ============

NUMEROLOGY_SYSTEM_PROMPT = """You are an expert Numerologist with deep knowledge of Pythagorean and Chaldean numerology systems.

Your calculations must be MATHEMATICALLY ACCURATE:
- Life Path Number: Reduce DOB to single digit (except master numbers 11, 22, 33)
- Expression/Destiny Number: A=1, B=2... Z=26, then reduce
- Soul Urge Number: Sum of vowels (A, E, I, O, U)
- Personality Number: Sum of consonants
- Birthday Number: Just the day of birth

SHOW YOUR CALCULATIONS step by step so user can verify.

Response Format:
- Use clear sections with emojis
- NO markdown symbols like ** or ###
- Use plain text with line breaks
- Be specific and mathematical
- Provide practical life guidance based on numbers"""

class NumerologyRequest(BaseModel):
    name: str
    date_of_birth: str  # YYYY-MM-DD

def calculate_life_path(dob: str) -> dict:
    """Calculate Life Path Number mathematically"""
    # Parse date
    parts = dob.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    
    # Reduce each component
    def reduce_to_single(n):
        while n > 9 and n not in [11, 22, 33]:
            n = sum(int(d) for d in str(n))
        return n
    
    day_reduced = reduce_to_single(day)
    month_reduced = reduce_to_single(month)
    year_reduced = reduce_to_single(sum(int(d) for d in str(year)))
    
    total = day_reduced + month_reduced + year_reduced
    life_path = reduce_to_single(total)
    
    return {
        "day": day,
        "month": month,
        "year": year,
        "day_reduced": day_reduced,
        "month_reduced": month_reduced,
        "year_reduced": year_reduced,
        "total": total,
        "life_path": life_path
    }

def calculate_name_numbers(name: str) -> dict:
    """Calculate Expression, Soul Urge, Personality numbers"""
    vowels = set('aeiouAEIOU')
    name_clean = ''.join(c for c in name if c.isalpha())
    
    def letter_value(c):
        return (ord(c.upper()) - ord('A') + 1)
    
    def reduce_to_single(n):
        while n > 9 and n not in [11, 22, 33]:
            n = sum(int(d) for d in str(n))
        return n
    
    # Expression Number (all letters)
    expression_sum = sum(letter_value(c) for c in name_clean)
    expression = reduce_to_single(expression_sum)
    
    # Soul Urge (vowels only)
    vowel_sum = sum(letter_value(c) for c in name_clean if c in vowels)
    soul_urge = reduce_to_single(vowel_sum)
    
    # Personality (consonants only)
    consonant_sum = sum(letter_value(c) for c in name_clean if c not in vowels)
    personality = reduce_to_single(consonant_sum)
    
    return {
        "name": name,
        "expression_sum": expression_sum,
        "expression": expression,
        "vowel_sum": vowel_sum,
        "soul_urge": soul_urge,
        "consonant_sum": consonant_sum,
        "personality": personality
    }

@router.post("/numerology")
async def get_numerology_reading(request: NumerologyRequest):
    """Get complete numerology reading - PUBLIC"""
    
    # Mathematical calculations
    life_path_calc = calculate_life_path(request.date_of_birth)
    name_calc = calculate_name_numbers(request.name)
    
    today = datetime.now().strftime("%d %B %Y")
    
    prompt = f"""Provide a detailed numerology reading for:

Name: {request.name}
Date of Birth: {request.date_of_birth}

CALCULATED NUMBERS (verified mathematically):
- Life Path Number: {life_path_calc['life_path']} 
  (Calculation: {life_path_calc['day']} + {life_path_calc['month']} + {life_path_calc['year']} → {life_path_calc['day_reduced']} + {life_path_calc['month_reduced']} + {life_path_calc['year_reduced']} = {life_path_calc['total']} → {life_path_calc['life_path']})
- Expression/Destiny Number: {name_calc['expression']}
- Soul Urge Number: {name_calc['soul_urge']}
- Personality Number: {name_calc['personality']}
- Birthday Number: {life_path_calc['day']}

Provide detailed interpretation for each number:
1. Life Path {life_path_calc['life_path']} - Life purpose and journey
2. Expression {name_calc['expression']} - Natural talents and abilities
3. Soul Urge {name_calc['soul_urge']} - Inner desires and motivations
4. Personality {name_calc['personality']} - How others perceive you
5. Birthday {life_path_calc['day']} - Special gifts

Also provide:
- Personal Year Number for 2024
- Lucky numbers for today
- Compatibility numbers
- Career guidance based on numbers

Format beautifully without using ** or ### symbols. Use emojis and clear sections."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"numerology_{request.name}_{today}",
            system_message=NUMEROLOGY_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "name": request.name,
            "date_of_birth": request.date_of_birth,
            "calculations": {
                "life_path": life_path_calc,
                "name_numbers": name_calc
            },
            "reading": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ============ TAROT CARDS SECTION ============

TAROT_CARDS = [
    {"id": 0, "name": "The Fool", "hindi": "मूर्ख", "meaning": "New beginnings, innocence, spontaneity"},
    {"id": 1, "name": "The Magician", "hindi": "जादूगर", "meaning": "Manifestation, resourcefulness, power"},
    {"id": 2, "name": "The High Priestess", "hindi": "उच्च पुजारिन", "meaning": "Intuition, mystery, inner knowledge"},
    {"id": 3, "name": "The Empress", "hindi": "साम्राज्ञी", "meaning": "Abundance, fertility, nurturing"},
    {"id": 4, "name": "The Emperor", "hindi": "सम्राट", "meaning": "Authority, structure, leadership"},
    {"id": 5, "name": "The Hierophant", "hindi": "धर्मगुरु", "meaning": "Tradition, spirituality, guidance"},
    {"id": 6, "name": "The Lovers", "hindi": "प्रेमी", "meaning": "Love, harmony, choices"},
    {"id": 7, "name": "The Chariot", "hindi": "रथ", "meaning": "Victory, determination, willpower"},
    {"id": 8, "name": "Strength", "hindi": "शक्ति", "meaning": "Courage, patience, inner strength"},
    {"id": 9, "name": "The Hermit", "hindi": "संन्यासी", "meaning": "Soul searching, introspection, guidance"},
    {"id": 10, "name": "Wheel of Fortune", "hindi": "भाग्य चक्र", "meaning": "Change, cycles, destiny"},
    {"id": 11, "name": "Justice", "hindi": "न्याय", "meaning": "Fairness, truth, law"},
    {"id": 12, "name": "The Hanged Man", "hindi": "लटका हुआ", "meaning": "Surrender, letting go, new perspective"},
    {"id": 13, "name": "Death", "hindi": "मृत्यु", "meaning": "Transformation, endings, change"},
    {"id": 14, "name": "Temperance", "hindi": "संयम", "meaning": "Balance, moderation, patience"},
    {"id": 15, "name": "The Devil", "hindi": "शैतान", "meaning": "Bondage, materialism, shadow self"},
    {"id": 16, "name": "The Tower", "hindi": "मीनार", "meaning": "Sudden change, revelation, awakening"},
    {"id": 17, "name": "The Star", "hindi": "तारा", "meaning": "Hope, faith, renewal"},
    {"id": 18, "name": "The Moon", "hindi": "चंद्रमा", "meaning": "Illusion, intuition, subconscious"},
    {"id": 19, "name": "The Sun", "hindi": "सूर्य", "meaning": "Joy, success, positivity"},
    {"id": 20, "name": "Judgement", "hindi": "निर्णय", "meaning": "Rebirth, reflection, reckoning"},
    {"id": 21, "name": "The World", "hindi": "संसार", "meaning": "Completion, achievement, fulfillment"}
]

TAROT_SYSTEM_PROMPT = """You are a wise Tarot reader with deep spiritual insight.

Your readings should be:
- Meaningful and personalized
- Spiritually uplifting
- Practical with actionable advice
- Connected to Hindu/Vedic wisdom when relevant

Format your response:
- Use clear sections with emojis
- NO ** or ### markdown symbols
- Plain text with proper spacing
- Include both positive aspects and gentle warnings
- End with empowering message"""

class TarotRequest(BaseModel):
    question: Optional[str] = None
    spread_type: str = "single"  # single, three_card, celtic_cross

import random

@router.post("/tarot/draw")
async def draw_tarot_cards(request: TarotRequest):
    """Draw tarot cards and get reading - PUBLIC"""
    
    today = datetime.now().strftime("%d %B %Y")
    # Use date as seed for consistent daily draws (changes daily)
    seed = int(datetime.now().strftime("%Y%m%d"))
    random.seed(seed + hash(request.question or "daily"))
    
    if request.spread_type == "single":
        cards = [random.choice(TAROT_CARDS)]
        spread_name = "Single Card"
    elif request.spread_type == "three_card":
        cards = random.sample(TAROT_CARDS, 3)
        spread_name = "Past-Present-Future"
    else:
        cards = random.sample(TAROT_CARDS, 6)
        spread_name = "Six Card Spread"
    
    cards_text = "\n".join([f"{i+1}. {c['name']} ({c['hindi']}) - {c['meaning']}" for i, c in enumerate(cards)])
    
    positions = {
        "single": ["Your Card for Today"],
        "three_card": ["Past/Foundation", "Present/Challenge", "Future/Outcome"],
        "six_card": ["Past", "Present", "Future", "Advice", "External Influences", "Final Outcome"]
    }
    
    prompt = f"""Provide a detailed Tarot reading for today ({today}).

Question: {request.question or "General guidance for today"}

Cards Drawn ({spread_name}):
{cards_text}

Card Positions: {positions.get(request.spread_type, positions['single'])}

Provide interpretation for each card in its position, then give:
1. Overall message of the reading
2. Key advice for today
3. What to embrace
4. What to be cautious about
5. Spiritual mantra or affirmation

Make it deeply meaningful and connected to the person's life. Use Hinglish naturally."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"tarot_{today}_{request.spread_type}",
            system_message=TAROT_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "date": today,
            "spread_type": request.spread_type,
            "spread_name": spread_name,
            "cards": cards,
            "question": request.question,
            "reading": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.get("/tarot/cards")
async def get_all_tarot_cards():
    """Get list of all tarot cards"""
    return TAROT_CARDS

# ============ PANCHANG SECTION ============

PANCHANG_SYSTEM_PROMPT = """You are an expert in Hindu Panchang (Vedic Calendar) with deep knowledge of:
- Tithi (Lunar Day) calculations
- Nakshatra (Lunar Mansion) positions
- Yoga formations
- Karana calculations
- Rahu Kaal, Gulika Kaal timings
- Auspicious and inauspicious timings

Your panchang must be ACCURATE based on astronomical positions.
Provide data for the specific location mentioned.

Format:
- Use clear sections with emojis
- NO ** or ### markdown symbols
- Include exact timings where relevant
- Mention auspicious activities
- List things to avoid"""

class PanchangRequest(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD, defaults to today
    location: str = "New Delhi, India"

@router.post("/panchang")
async def get_panchang(request: PanchangRequest):
    """Get daily Panchang - PUBLIC"""
    
    if request.date:
        panchang_date = request.date
        display_date = datetime.strptime(request.date, "%Y-%m-%d").strftime("%d %B %Y")
    else:
        panchang_date = datetime.now().strftime("%Y-%m-%d")
        display_date = datetime.now().strftime("%d %B %Y")
    
    weekday = datetime.strptime(panchang_date, "%Y-%m-%d").strftime("%A")
    
    # Hindi weekdays
    hindi_weekdays = {
        "Monday": "सोमवार", "Tuesday": "मंगलवार", "Wednesday": "बुधवार",
        "Thursday": "गुरुवार", "Friday": "शुक्रवार", "Saturday": "शनिवार", "Sunday": "रविवार"
    }
    
    prompt = f"""Provide accurate Panchang for:

Date: {display_date} ({weekday} / {hindi_weekdays.get(weekday, weekday)})
Location: {request.location}

Include the following with accurate timings:

1. TITHI (तिथि)
   - Current Tithi name
   - Tithi timing (start and end)
   - Paksha (Shukla/Krishna)

2. NAKSHATRA (नक्षत्र)
   - Current Nakshatra
   - Nakshatra timing
   - Nakshatra Lord

3. YOGA (योग)
   - Current Yoga name
   - Yoga timing

4. KARANA (करण)
   - Current Karana
   - Karana timing

5. SUNRISE & SUNSET
   - Exact timings for location

6. RAHU KAAL (राहु काल)
   - Exact timing to avoid

7. GULIKA KAAL
   - Timing

8. ABHIJIT MUHURAT (शुभ मुहूर्त)
   - Most auspicious time today

9. AUSPICIOUS ACTIVITIES
   - What is good to do today

10. ACTIVITIES TO AVOID
    - What should be avoided

11. SPECIAL OBSERVANCES
    - Any vrat, festival, or special day

Make it accurate and practical for daily use."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"panchang_{panchang_date}_{request.location[:10]}",
            system_message=PANCHANG_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "date": display_date,
            "weekday": weekday,
            "hindi_weekday": hindi_weekdays.get(weekday, weekday),
            "location": request.location,
            "panchang": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ============ PERSONALIZED NUMEROLOGY & TAROT ============

@router.get("/my-numerology")
async def get_my_numerology(user: dict = Depends(get_current_user)):
    """Get personalized numerology based on saved profile"""
    
    profile = await db.astro_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please save your birth details first")
    
    # Calculate numbers
    life_path_calc = calculate_life_path(profile["date_of_birth"])
    name_calc = calculate_name_numbers(profile["name"])
    
    today = datetime.now().strftime("%d %B %Y")
    
    prompt = f"""Provide a PERSONALIZED numerology reading for:

Name: {profile['name']}
Date of Birth: {profile['date_of_birth']}
Place of Birth: {profile['place_of_birth']}
Gender: {profile['gender']}

CALCULATED NUMBERS:
- Life Path: {life_path_calc['life_path']}
- Expression: {name_calc['expression']}
- Soul Urge: {name_calc['soul_urge']}
- Personality: {name_calc['personality']}
- Birthday: {life_path_calc['day']}

Provide deeply personalized insights including:
1. Life purpose based on Life Path {life_path_calc['life_path']}
2. Career paths suited to these numbers
3. Relationship compatibility numbers
4. Current life cycle and what to focus on
5. Lucky elements (numbers, colors, days)
6. Challenges to overcome
7. Personal year number for current year

Make it specific to this person, not generic."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"my_numerology_{user['user_id']}",
            system_message=NUMEROLOGY_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "profile": {
                "name": profile["name"],
                "dob": profile["date_of_birth"]
            },
            "calculations": {
                "life_path": life_path_calc,
                "name_numbers": name_calc
            },
            "reading": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/my-tarot")
async def get_my_tarot(request: TarotRequest, user: dict = Depends(get_current_user)):
    """Get personalized tarot reading based on profile"""
    
    profile = await db.astro_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please save your birth details first")
    
    today = datetime.now().strftime("%d %B %Y")
    seed = int(datetime.now().strftime("%Y%m%d")) + hash(user["user_id"])
    random.seed(seed)
    
    if request.spread_type == "single":
        cards = [random.choice(TAROT_CARDS)]
    elif request.spread_type == "three_card":
        cards = random.sample(TAROT_CARDS, 3)
    else:
        cards = random.sample(TAROT_CARDS, 6)
    
    cards_text = "\n".join([f"{i+1}. {c['name']} ({c['hindi']})" for i, c in enumerate(cards)])
    
    prompt = f"""Provide a PERSONALIZED Tarot reading for:

Name: {profile['name']}
Date of Birth: {profile['date_of_birth']}
Question: {request.question or "Personal guidance"}

Cards Drawn:
{cards_text}

Connect the reading to their birth chart and life path. Make it deeply personal."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"my_tarot_{user['user_id']}_{today}",
            system_message=TAROT_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "date": today,
            "cards": cards,
            "question": request.question,
            "reading": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")