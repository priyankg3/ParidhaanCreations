# Reviews Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/reviews", tags=["Reviews"])

db = None
get_current_user = None

def init_router(database, user_getter):
    global db, get_current_user
    db = database
    get_current_user = user_getter

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    images: List[str] = []

@router.get("/{product_id}")
async def get_product_reviews(product_id: str):
    """Get all reviews for a product (public)"""
    reviews = await db.reviews.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate stats
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r in reviews:
            rating_distribution[r["rating"]] = rating_distribution.get(r["rating"], 0) + 1
    else:
        avg_rating = 0
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    return {
        "reviews": reviews,
        "count": len(reviews),
        "avg_rating": round(avg_rating, 1),
        "rating_distribution": rating_distribution
    }

@router.post("")
async def create_review(
    review: ReviewCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a product review"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required to review")
    
    # Check if product exists
    product = await db.products.find_one({"product_id": review.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate rating
    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already reviewed
    existing = await db.reviews.find_one({
        "product_id": review.product_id,
        "user_id": user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Check if user has purchased this product
    has_purchased = await db.orders.find_one({
        "user_id": user.user_id,
        "items.product_id": review.product_id,
        "payment_status": "paid"
    })
    
    review_data = {
        "review_id": f"review_{uuid.uuid4().hex[:12]}",
        "product_id": review.product_id,
        "user_id": user.user_id,
        "user_name": user.name or user.email.split("@")[0],
        "user_avatar": getattr(user, 'avatar_url', None),
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "images": review.images,
        "verified_purchase": has_purchased is not None,
        "helpful_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_data)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.products.update_one(
        {"product_id": review.product_id},
        {"$set": {"avg_rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return {"message": "Review submitted", "review_id": review_data["review_id"]}

@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a review (owner or admin)"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check permission
    if review["user_id"] != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    product_id = review["product_id"]
    
    await db.reviews.delete_one({"review_id": review_id})
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    else:
        avg_rating = 0
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"avg_rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return {"message": "Review deleted"}

@router.post("/{review_id}/helpful")
async def mark_helpful(
    review_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Mark review as helpful"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$inc": {"helpful_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Marked as helpful"}
