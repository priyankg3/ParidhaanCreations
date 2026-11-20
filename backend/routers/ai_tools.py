# AI Description Generator for Products
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from llm_compat import LlmChat, UserMessage  # was: emergentintegrations (removed)

router = APIRouter(prefix="/ai", tags=["AI Tools"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

class DescriptionRequest(BaseModel):
    product_name: str
    category: str
    material: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price: Optional[float] = None
    additional_info: Optional[str] = None

DESCRIPTION_SYSTEM_PROMPT = """You are a professional e-commerce copywriter for Paridhaan Creations, an Indian handicrafts and spiritual items store.

Your task is to write compelling, SEO-friendly product descriptions in ENGLISH ONLY that:
1. Highlight the spiritual and traditional significance
2. Describe the craftsmanship, quality, and materials accurately
3. Mention practical details (material, care instructions if relevant)
4. Create emotional connection with buyers
5. Use relevant keywords naturally for SEO

Style:
- Professional, warm, and inviting tone
- Write in ENGLISH only. Do NOT use Hindi or Hinglish.
- 100-150 words maximum. Be concise and impactful.
- Do NOT use emojis
- Do NOT mention store name
- Focus on the product's unique qualities and benefits
- End with a subtle call to action
- Sound like a professional product listing, not a blog post

For Laddu Gopal dresses/poshaks specifically:
- Describe the fabric quality, embroidery details, and any accessories included
- Mention suitable festivals or occasions
- Include care instructions briefly"""

@router.post("/generate-description")
async def generate_product_description(request: DescriptionRequest):
    """Generate AI-powered product description"""
    
    prompt = f"""Write a product description for:

Product Name: {request.product_name}
Category: {request.category}
{f"Material: {request.material}" if request.material else ""}
{f"Color: {request.color}" if request.color else ""}
{f"Size: {request.size}" if request.size else ""}
{f"Price: ₹{request.price}" if request.price else ""}
{f"Additional Info: {request.additional_info}" if request.additional_info else ""}

Write a compelling description that will make customers want to buy this product."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"desc_{request.product_name[:20]}",
            system_message=DESCRIPTION_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")  # FREE tier model
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"description": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
