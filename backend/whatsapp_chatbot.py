"""
AI-Powered WhatsApp Chatbot for Paridhaan Creations
- Spiritual greeting style (Radhey Radhey, Jai Shree Krishna)
- Product recommendations and search
- Laddu Gopal size guide
- Order tracking
- Intelligent conversation handling
"""

import os
import re
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# System prompt for the AI chatbot
PARIDHAAN_SYSTEM_PROMPT = """You are the official WhatsApp assistant for Paridhaan Creations - a spiritual and traditional handicrafts e-commerce store in India.

## YOUR PERSONALITY:
- You are warm, devotional, and helpful
- You speak in Hinglish (mix of Hindi and English) naturally
- You always start with spiritual greetings like "Radhey Radhey 🙏", "Jai Shree Krishna", "Namaste"
- You are knowledgeable about Hindu traditions, pooja items, and Laddu Gopal care
- You treat customers like family ("aapke liye", "hamare yahan")

## STORE INFORMATION:
- Name: Paridhaan Creations (पारिधान क्रिएशन्स)
- Products: Handicrafts, Pooja Articles, Laddu Gopal Dresses, Artificial Jewellery, Traditional Decor
- Website: paridhaancreations.xyz
- Specialty: Laddu Gopal (Bal Gopal) dresses and accessories for all sizes (0 to 6+)

## LADDU GOPAL SIZE GUIDE:
- Size 0: Smallest, for very small murtis (about 3-4 inches)
- Size 1: Small murtis (about 4-5 inches)
- Size 2: Medium small (about 5-6 inches)
- Size 3: Medium (about 6-7 inches)
- Size 4: Medium large (about 7-8 inches)
- Size 5: Large (about 8-9 inches)
- Size 6: Very large (about 9-10 inches)
- Size 6+: Extra large murtis (10+ inches)

Tip: Measure from Thakurji's head to toe while standing to determine size.

## YOUR CAPABILITIES:
1. Answer product queries - recommend products based on customer needs
2. Help with Laddu Gopal dress sizing
3. Provide order status updates (ask for order ID)
4. Explain product details, materials, and care instructions
5. Guide customers to the website for purchases
6. Handle complaints gracefully and escalate to human support when needed

## IMPORTANT RULES:
- Never make up product information - only share what's provided in context
- For order issues, always ask for Order ID
- If you don't know something, say "Ek minute, main check karke batati hoon" and suggest contacting support
- Always end with a blessing or warm message
- Keep responses concise but helpful (WhatsApp style)
- Use emojis appropriately (🙏 🕉️ ✨ 📦 💰 etc.)

## RESPONSE FORMAT:
- Short paragraphs
- Use line breaks for readability
- Use *bold* for emphasis
- Include relevant emojis
- End with a spiritual touch"""

class WhatsAppAIChatbot:
    """AI-powered chatbot for WhatsApp using GPT"""
    
    def __init__(self, db=None):
        self.db = db
        self.chat_sessions = {}  # In-memory session storage (use DB in production)
        self.llm_key = os.environ.get("EMERGENT_LLM_KEY")
        
        if not self.llm_key:
            logger.warning("EMERGENT_LLM_KEY not set. AI responses will be template-based.")
    
    async def get_ai_response(self, user_message: str, context: str = "", session_id: str = "") -> str:
        """Get AI-generated response using GPT"""
        
        if not self.llm_key:
            # Fallback to template responses if no LLM key
            return await self._get_template_response(user_message)
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            # Build context-aware message
            full_message = user_message
            if context:
                full_message = f"[Context: {context}]\n\nCustomer message: {user_message}"
            
            # Create chat instance with spiritual system prompt
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=session_id or f"wa_{datetime.now().timestamp()}",
                system_message=PARIDHAAN_SYSTEM_PROMPT
            ).with_model("openai", "gpt-4o")  # Using GPT-4o for best quality
            
            # Send message and get response
            user_msg = UserMessage(text=full_message)
            response = await chat.send_message(user_msg)
            
            return response
            
        except ImportError:
            logger.error("emergentintegrations not installed. Using template responses.")
            return await self._get_template_response(user_message)
        except Exception as e:
            logger.error(f"AI response error: {e}")
            return await self._get_template_response(user_message)
    
    async def _get_template_response(self, message: str) -> str:
        """Fallback template-based responses when AI is not available"""
        
        message_lower = message.lower()
        
        # Greeting patterns
        greetings = ["hi", "hello", "hey", "namaste", "radhey", "krishna", "jai"]
        if any(g in message_lower for g in greetings):
            return """🙏 *Radhey Radhey!*

Paridhaan Creations mein aapka swagat hai! 🙏

Hum traditional handicrafts, pooja articles, aur Laddu Gopal dresses ke specialist hain.

Aap kaise help chahte ho?
• Products dekhne ke liye "products" likho
• Order track karne ke liye "track ORDER_ID" likho
• Laddu Gopal size guide ke liye "size guide" likho

Website: paridhaancreations.xyz ✨"""
        
        # Size guide queries
        size_keywords = ["size", "naap", "measurement", "laddu gopal", "bal gopal", "thakurji"]
        if any(k in message_lower for k in size_keywords):
            return """🕉️ *Laddu Gopal Size Guide*

Apne Thakurji ko head se toe tak measure karein:

• *Size 0:* 3-4 inch
• *Size 1:* 4-5 inch
• *Size 2:* 5-6 inch
• *Size 3:* 6-7 inch
• *Size 4:* 7-8 inch
• *Size 5:* 8-9 inch
• *Size 6:* 9-10 inch
• *Size 6+:* 10+ inch

Tip: Thakurji ko khade karke measure karein 📏

Kaunse size ki dress chahiye? Batao, hum aapko best options dikhate hain! 🙏"""
        
        # Order tracking
        if "track" in message_lower or "order" in message_lower:
            return """📦 *Order Tracking*

Apna Order ID share karein aur main aapko status bata deti hoon.

Format: ORDER_ID (jaise: order_abc123)

Ya website pe track karein:
paridhaancreations.xyz/track/ORDER_ID

Koi aur help chahiye? 🙏"""
        
        # Product queries
        product_keywords = ["product", "dress", "poshak", "jewellery", "pooja", "handicraft", "show", "dekho"]
        if any(k in message_lower for k in product_keywords):
            return """🛍️ *Hamare Products*

• *Laddu Gopal Dresses:* All sizes (0-6+)
• *Pooja Articles:* Thali, Diya, Kalash, etc.
• *Handicrafts:* Traditional decor items
• *Artificial Jewellery:* Beautiful designs

Website pe explore karein:
👉 paridhaancreations.xyz

Kuch specific chahiye? Batao! 🙏"""
        
        # Price queries
        if "price" in message_lower or "rate" in message_lower or "kitna" in message_lower:
            return """💰 *Pricing Information*

Prices website pe available hain with all details:
👉 paridhaancreations.xyz

Kaunsa product dekhna hai? Name ya category batao, main link share karti hoon! 🙏"""
        
        # Default response
        return """🙏 *Radhey Radhey!*

Main samajh nahi paayi. Kya aap yeh try kar sakte ho:

• "hi" - Start conversation
• "products" - View products
• "size guide" - Laddu Gopal sizing
• "track ORDER_ID" - Track order

Ya seedha website pe jaayein:
paridhaancreations.xyz

Kuch aur madad chahiye? 🙏"""
    
    async def process_message(
        self, 
        from_phone: str, 
        message_text: str,
        message_type: str = "text"
    ) -> Dict[str, Any]:
        """Process incoming WhatsApp message and generate response"""
        
        response_text = ""
        intent = "general"
        products_to_show = []
        
        message_lower = message_text.lower().strip()
        
        # Detect intent
        if any(word in message_lower for word in ["track", "order status", "kahan hai", "delivery"]):
            intent = "order_tracking"
            # Extract order ID if present
            order_id_match = re.search(r'order[_\s]?([a-zA-Z0-9]+)', message_text, re.IGNORECASE)
            if order_id_match:
                order_id = f"order_{order_id_match.group(1)}"
                # Try to find order in database
                if self.db:
                    order = await self.db.orders.find_one({"order_id": order_id}, {"_id": 0})
                    if order:
                        context = f"Order found: ID={order_id}, Status={order.get('status')}, Payment={order.get('payment_status')}"
                        response_text = await self.get_ai_response(message_text, context, from_phone)
                    else:
                        response_text = f"""🙏 Order ID *{order_id}* nahi mila.

Please check karein ki Order ID sahi hai.

Website pe track karein:
paridhaancreations.xyz/track/{order_id}

Ya customer support se contact karein. 🙏"""
            else:
                response_text = await self.get_ai_response(message_text, "", from_phone)
        
        elif any(word in message_lower for word in ["size", "naap", "laddu gopal", "bal gopal", "measurement"]):
            intent = "size_guide"
            # Check if asking about specific size
            size_match = re.search(r'size\s*(\d+\+?)', message_lower)
            if size_match and self.db:
                size = size_match.group(1)
                products = await self.db.products.find(
                    {"laddu_gopal_sizes": size}, 
                    {"_id": 0}
                ).limit(5).to_list(5)
                
                if products:
                    context = f"Found {len(products)} products for Laddu Gopal size {size}: " + ", ".join([p.get("name", "") for p in products])
                    products_to_show = products
                    response_text = await self.get_ai_response(message_text, context, from_phone)
                else:
                    response_text = await self.get_ai_response(message_text, f"No products found for size {size}", from_phone)
            else:
                response_text = await self.get_ai_response(message_text, "", from_phone)
        
        elif any(word in message_lower for word in ["product", "dress", "poshak", "show", "dikha", "pooja", "jewellery"]):
            intent = "product_search"
            if self.db:
                # Search for products
                search_terms = message_lower.replace("product", "").replace("show", "").replace("dikha", "").strip()
                if search_terms:
                    products = await self.db.products.find(
                        {"$or": [
                            {"name": {"$regex": search_terms, "$options": "i"}},
                            {"category": {"$regex": search_terms, "$options": "i"}},
                            {"tags": {"$regex": search_terms, "$options": "i"}}
                        ]},
                        {"_id": 0}
                    ).limit(5).to_list(5)
                    
                    if products:
                        context = f"Found {len(products)} products: " + ", ".join([f"{p.get('name')} (₹{p.get('price')})" for p in products])
                        products_to_show = products
                        response_text = await self.get_ai_response(message_text, context, from_phone)
                    else:
                        response_text = await self.get_ai_response(message_text, "No products found for search", from_phone)
                else:
                    # Show featured products
                    products = await self.db.products.find(
                        {"featured": True},
                        {"_id": 0}
                    ).limit(5).to_list(5)
                    context = f"Featured products: " + ", ".join([p.get("name", "") for p in products]) if products else ""
                    products_to_show = products
                    response_text = await self.get_ai_response(message_text, context, from_phone)
            else:
                response_text = await self.get_ai_response(message_text, "", from_phone)
        
        elif any(word in message_lower for word in ["help", "support", "complaint", "problem", "issue"]):
            intent = "support"
            response_text = """🙏 *Customer Support*

Hum aapki madad ke liye yahan hain!

📞 WhatsApp: +91 9871819508
📧 Email: priyankg3@gmail.com
🌐 Website: paridhaancreations.xyz/support

Apni problem detail mein batayein, hum jaldi se jaldi solve karenge.

Radhey Radhey! 🙏"""
        
        else:
            # General AI response
            intent = "general"
            response_text = await self.get_ai_response(message_text, "", from_phone)
        
        # Store conversation in database
        if self.db:
            await self._store_conversation(from_phone, message_text, response_text, intent)
        
        return {
            "response": response_text,
            "intent": intent,
            "products": products_to_show
        }
    
    async def _store_conversation(
        self, 
        phone: str, 
        user_message: str, 
        bot_response: str,
        intent: str
    ):
        """Store conversation in database for analytics and history"""
        try:
            if self.db:
                await self.db.whatsapp_conversations.insert_one({
                    "phone": phone,
                    "user_message": user_message,
                    "bot_response": bot_response,
                    "intent": intent,
                    "timestamp": datetime.now(timezone.utc)
                })
        except Exception as e:
            logger.error(f"Error storing conversation: {e}")
    
    async def get_conversation_history(self, phone: str, limit: int = 10) -> List[Dict]:
        """Get recent conversation history for a phone number"""
        if not self.db:
            return []
        
        try:
            conversations = await self.db.whatsapp_conversations.find(
                {"phone": phone},
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit).to_list(limit)
            return conversations
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []


# Helper function to format product for WhatsApp
def format_product_for_whatsapp(product: Dict, site_url: str = "https://paridhaancreations.xyz") -> str:
    """Format a product as a WhatsApp-friendly message"""
    
    name = product.get("name", "Product")
    price = product.get("price", 0)
    stock = product.get("stock", 0)
    product_id = product.get("product_id", "")
    laddu_sizes = product.get("laddu_gopal_sizes", [])
    
    stock_status = "✅ In Stock" if stock > 0 else "❌ Out of Stock"
    size_info = f"\n🕉️ Size: {', '.join(laddu_sizes)}" if laddu_sizes else ""
    
    return f"""*{name}*
💰 ₹{price:.0f} | {stock_status}{size_info}
🛒 {site_url}/product/{product_id}"""


def format_products_list(products: List[Dict], site_url: str = "https://paridhaancreations.xyz") -> str:
    """Format multiple products as a WhatsApp list"""
    
    if not products:
        return "Koi product nahi mila. Website pe dekho: " + site_url
    
    lines = ["🛍️ *Products Found:*\n"]
    
    for i, product in enumerate(products[:5], 1):
        name = product.get("name", "Product")[:40]
        price = product.get("price", 0)
        product_id = product.get("product_id", "")
        
        lines.append(f"{i}. *{name}*")
        lines.append(f"   ₹{price:.0f} | {site_url}/product/{product_id}\n")
    
    lines.append(f"\n✨ More products: {site_url}")
    
    return "\n".join(lines)
