#!/usr/bin/env python3

import pymongo
from datetime import datetime, timezone, timedelta
import uuid

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017")
db = client["test_database"]

def create_sample_data():
    print("🌱 Creating sample data for e-commerce app...")
    
    # Clear existing data
    db.products.delete_many({})
    db.categories.delete_many({})
    db.banners.delete_many({})
    db.users.delete_many({})
    db.user_sessions.delete_many({})
    db.coupons.delete_many({})
    
    # Create categories
    categories = [
        {
            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
            "name": "Handicrafts",
            "slug": "handicrafts",
            "description": "Beautiful handcrafted items made by skilled artisans",
            "image": "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
            "name": "Pooja Articles",
            "slug": "pooja",
            "description": "Sacred items for worship and spiritual practices",
            "image": "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
            "name": "Perfumes",
            "slug": "perfumes",
            "description": "Exquisite fragrances and luxury perfumes",
            "image": "https://images.unsplash.com/photo-1758871992965-836e1fb0f9bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBwZXJmdW1lJTIwYm90dGxlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2OTE2MzkyNnww&ixlib=rb-4.1.0&q=85",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
            "name": "Jewellery",
            "slug": "jewellery",
            "description": "Traditional and artificial jewellery pieces",
            "image": "https://images.unsplash.com/photo-1738754719555-05aca36707b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    db.categories.insert_many(categories)
    print(f"✅ Created {len(categories)} categories")
    
    # Create products
    products = [
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Brass Decorative Diya Set",
            "description": "Beautiful handcrafted brass diyas perfect for festivals and daily worship. Set of 5 traditional oil lamps.",
            "price": 899.0,
            "category": "handicrafts",
            "images": ["https://images.unsplash.com/photo-1767338718657-9006d701ce6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85"],
            "stock": 25,
            "featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Wooden Carved Elephant",
            "description": "Intricately carved wooden elephant showpiece. Perfect for home decoration and gifting.",
            "price": 1299.0,
            "category": "handicrafts",
            "images": ["https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85"],
            "stock": 15,
            "featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Silver Plated Pooja Thali",
            "description": "Complete silver plated pooja thali set with all essential items for worship rituals.",
            "price": 2499.0,
            "category": "pooja",
            "images": ["https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg"],
            "stock": 20,
            "featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Incense Stick Holder Set",
            "description": "Elegant brass incense stick holders with intricate designs. Set of 3 different sizes.",
            "price": 599.0,
            "category": "pooja",
            "images": ["https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg"],
            "stock": 30,
            "featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Royal Oud Perfume",
            "description": "Luxurious oud-based perfume with rich, long-lasting fragrance. 50ml bottle.",
            "price": 3999.0,
            "category": "perfumes",
            "images": ["https://images.unsplash.com/photo-1768025719875-48ed072f3084?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZXJmdW1lJTIwYm90dGxlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2OTE2MzkyNnww&ixlib=rb-4.1.0&q=85"],
            "stock": 12,
            "featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Floral Attar Collection",
            "description": "Set of 5 different floral attars in beautiful glass bottles. Natural and alcohol-free.",
            "price": 1899.0,
            "category": "perfumes",
            "images": ["https://images.unsplash.com/photo-1758871992965-836e1fb0f9bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBwZXJmdW1lJTIwYm90dGxlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2OTE2MzkyNnww&ixlib=rb-4.1.0&q=85"],
            "stock": 18,
            "featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Kundan Necklace Set",
            "description": "Elegant artificial kundan necklace with matching earrings. Perfect for special occasions.",
            "price": 2799.0,
            "category": "jewellery",
            "images": ["https://images.unsplash.com/photo-1738754712726-d126c15e206b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85"],
            "stock": 8,
            "featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": f"prod_{uuid.uuid4().hex[:12]}",
            "name": "Traditional Bangles Set",
            "description": "Set of 12 traditional gold-plated bangles with intricate patterns. Available in multiple sizes.",
            "price": 999.0,
            "category": "jewellery",
            "images": ["https://images.unsplash.com/photo-1738754719555-05aca36707b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85"],
            "stock": 22,
            "featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    db.products.insert_many(products)
    print(f"✅ Created {len(products)} products")
    
    # Create banners
    banners = [
        {
            "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
            "title": "Festival Special Collection",
            "image": "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85",
            "link": "/products?category=handicrafts",
            "position": 1,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
            "title": "Premium Jewellery Collection",
            "image": "https://images.unsplash.com/photo-1738754712726-d126c15e206b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85",
            "link": "/products?category=jewellery",
            "position": 2,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    db.banners.insert_many(banners)
    print(f"✅ Created {len(banners)} banners")
    
    # Create admin user
    admin_user_id = f"user_{uuid.uuid4().hex[:12]}"
    admin_user = {
        "user_id": admin_user_id,
        "email": "admin@paridhaan.com",
        "name": "Admin User",
        "picture": "https://via.placeholder.com/150",
        "is_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.users.insert_one(admin_user)
    
    # Create admin session
    admin_session_token = f"admin_session_{uuid.uuid4().hex[:16]}"
    admin_session = {
        "user_id": admin_user_id,
        "session_token": admin_session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    db.user_sessions.insert_one(admin_session)
    print(f"✅ Created admin user with session token: {admin_session_token}")
    
    # Create test user
    test_user_id = f"user_{uuid.uuid4().hex[:12]}"
    test_user = {
        "user_id": test_user_id,
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.users.insert_one(test_user)
    
    # Create test user session
    test_session_token = f"test_session_{uuid.uuid4().hex[:16]}"
    test_session = {
        "user_id": test_user_id,
        "session_token": test_session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    db.user_sessions.insert_one(test_session)
    print(f"✅ Created test user with session token: {test_session_token}")
    
    # Create sample coupons
    coupons = [
        {
            "coupon_id": f"coupon_{uuid.uuid4().hex[:12]}",
            "code": "SAVE10",
            "discount_percentage": 10.0,
            "discount_amount": None,
            "valid_from": datetime.now(timezone.utc),
            "valid_to": datetime.now(timezone.utc) + datetime.timedelta(days=30),
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "coupon_id": f"coupon_{uuid.uuid4().hex[:12]}",
            "code": "FLAT100",
            "discount_percentage": None,
            "discount_amount": 100.0,
            "valid_from": datetime.now(timezone.utc),
            "valid_to": datetime.now(timezone.utc) + datetime.timedelta(days=15),
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    db.coupons.insert_many(coupons)
    print(f"✅ Created {len(coupons)} coupons")
    
    print("\n🎉 Sample data creation completed!")
    print(f"Admin session token: {admin_session_token}")
    print(f"Test user session token: {test_session_token}")
    
    return admin_session_token, test_session_token

if __name__ == "__main__":
    create_sample_data()