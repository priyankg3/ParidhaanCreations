# 🧪 Backend API Testing Guide - Paridhaan Creations

## Overview
This guide provides comprehensive instructions for testing all backend APIs of the Paridhaan Creations e-commerce platform.

---

## 📋 Prerequisites

### 1. Get the Backend URL
```bash
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL
```

### 2. Set Environment Variable
```bash
export API_URL="<your_backend_url>"
# Example: export API_URL="https://your-app.emergentagent.com"
```

### 3. Get Admin Session Token (for Admin APIs)
```bash
mongosh --eval "
use test_database;
db.user_sessions.findOne({}, {session_token: 1, _id: 0}).session_token
"
```

---

## 🛍️ Product APIs

### Get All Products
```bash
curl -X GET "$API_URL/api/products"
```

### Get Products by Category
```bash
curl -X GET "$API_URL/api/products?category=handicrafts"
curl -X GET "$API_URL/api/products?category=pooja"
curl -X GET "$API_URL/api/products?category=perfumes"
curl -X GET "$API_URL/api/products?category=jewellery"
```

### Get Featured Products
```bash
curl -X GET "$API_URL/api/products?featured=true"
```

### Search Products
```bash
curl -X GET "$API_URL/api/products?search=brass"
```

### Get Single Product
```bash
curl -X GET "$API_URL/api/products/prod_001"
```

### Create Product (Admin Only)
```bash
ADMIN_TOKEN="<your_admin_session_token>"

curl -X POST "$API_URL/api/products" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$ADMIN_TOKEN" \\
  -d '{
    "name": "Test Product",
    "description": "This is a test product",
    "price": 999,
    "category": "handicrafts",
    "images": ["https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=800"],
    "stock": 10,
    "featured": false
  }'
```

### Update Product (Admin Only)
```bash
curl -X PUT "$API_URL/api/products/prod_001" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$ADMIN_TOKEN" \\
  -d '{
    "name": "Updated Product Name",
    "description": "Updated description",
    "price": 1299,
    "category": "pooja",
    "images": ["https://example.com/image.jpg"],
    "stock": 20,
    "featured": true
  }'
```

### Delete Product (Admin Only)
```bash
curl -X DELETE "$API_URL/api/products/prod_001" \\
  -H "Cookie: session_token=$ADMIN_TOKEN"
```

---

## 📂 Category APIs

### Get All Categories
```bash
curl -X GET "$API_URL/api/categories"
```

### Create Category (Admin Only)
```bash
curl -X POST "$API_URL/api/categories" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$ADMIN_TOKEN" \\
  -d '{
    "name": "Test Category",
    "slug": "test-category",
    "description": "This is a test category",
    "image": "https://example.com/category.jpg"
  }'
```

---

## 🛒 Cart APIs

### Get Cart
```bash
curl -X GET "$API_URL/api/cart" -b cookies.txt
```

### Add to Cart
```bash
curl -X POST "$API_URL/api/cart/add" \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -c cookies.txt \\
  -d '{
    "product_id": "prod_001",
    "quantity": 2
  }'
```

### Remove from Cart
```bash
curl -X DELETE "$API_URL/api/cart/remove/prod_001" -b cookies.txt
```

### Clear Cart
```bash
curl -X POST "$API_URL/api/cart/clear" -b cookies.txt
```

---

## ❤️ Wishlist APIs

### Get Wishlist (Login Required)
```bash
USER_TOKEN="<your_user_session_token>"

curl -X GET "$API_URL/api/wishlist" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

### Add to Wishlist
```bash
curl -X POST "$API_URL/api/wishlist/add/prod_001" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

### Remove from Wishlist
```bash
curl -X DELETE "$API_URL/api/wishlist/remove/prod_001" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

---

## 📦 Order APIs

### Create Order
```bash
curl -X POST "$API_URL/api/orders" \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{
    "items": [
      {
        "product_id": "prod_001",
        "product_name": "Brass Diya Set",
        "quantity": 2,
        "price": 599
      }
    ],
    "total_amount": 1198,
    "payment_method": "razorpay",
    "shipping_address": {
      "full_name": "John Doe",
      "phone": "9876543210",
      "address_line1": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "guest_email": "john@example.com"
  }'
```

### Get My Orders (Login Required)
```bash
curl -X GET "$API_URL/api/orders" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

### Get Single Order
```bash
curl -X GET "$API_URL/api/orders/order_abc123" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

---

## 💳 Payment APIs

### Create Razorpay Order
```bash
curl -X POST "$API_URL/api/payments/razorpay/order?order_id=order_abc123"
```

### Verify Razorpay Payment
```bash
curl -X POST "$API_URL/api/payments/razorpay/verify" \\
  -H "Content-Type: application/json" \\
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx"
  }'
```

### Create Stripe Checkout Session
```bash
curl -X POST "$API_URL/api/payments/stripe/session?order_id=order_abc123&origin_url=https://yourapp.com"
```

### Get Stripe Payment Status
```bash
curl -X GET "$API_URL/api/payments/stripe/status/cs_test_xxx"
```

---

## 🎫 Coupon APIs

### Validate Coupon
```bash
curl -X POST "$API_URL/api/coupons/validate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "SAVE10",
    "total_amount": 1000
  }'
```

### Create Coupon (Admin Only)
```bash
curl -X POST "$API_URL/api/coupons" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$ADMIN_TOKEN" \\
  -d '{
    "code": "SAVE10",
    "discount_percentage": 10,
    "valid_from": "2026-01-01T00:00:00Z",
    "valid_to": "2026-12-31T23:59:59Z",
    "active": true
  }'
```

---

## 🎪 Banner APIs

### Get All Banners
```bash
curl -X GET "$API_URL/api/banners"
```

### Create Banner (Admin Only)
```bash
curl -X POST "$API_URL/api/banners" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$ADMIN_TOKEN" \\
  -d '{
    "title": "Summer Sale",
    "image": "https://example.com/banner.jpg",
    "link": "/products",
    "position": 1,
    "active": true
  }'
```

---

## ⭐ Review APIs

### Get Product Reviews
```bash
curl -X GET "$API_URL/api/reviews/prod_001"
```

### Create Review (Login Required)
```bash
curl -X POST "$API_URL/api/reviews" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session_token=$USER_TOKEN" \\
  -d '{
    "product_id": "prod_001",
    "rating": 5,
    "comment": "Excellent product! Highly recommended."
  }'
```

### Delete Review
```bash
curl -X DELETE "$API_URL/api/reviews/review_abc123" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

---

## 👤 Authentication APIs

### Get Current User
```bash
curl -X GET "$API_URL/api/auth/me" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

### Logout
```bash
curl -X POST "$API_URL/api/auth/logout" \\
  -H "Cookie: session_token=$USER_TOKEN"
```

---

## 📊 Admin Analytics APIs

### Get Analytics Dashboard
```bash
curl -X GET "$API_URL/api/admin/analytics" \\
  -H "Cookie: session_token=$ADMIN_TOKEN"
```

### Get All Orders (Admin)
```bash
curl -X GET "$API_URL/api/admin/orders" \\
  -H "Cookie: session_token=$ADMIN_TOKEN"
```

### Update Order Status
```bash
curl -X PUT "$API_URL/api/admin/orders/order_abc123/status?status=shipped" \\
  -H "Cookie: session_token=$ADMIN_TOKEN"
```

---

## 🧪 Test Scenarios

### Scenario 1: Complete Purchase Flow
```bash
# 1. Add items to cart
curl -X POST "$API_URL/api/cart/add" -H "Content-Type: application/json" -d '{"product_id":"prod_001","quantity":1}'

# 2. Get cart
curl -X GET "$API_URL/api/cart"

# 3. Create order
ORDER_ID=$(curl -s -X POST "$API_URL/api/orders" -H "Content-Type: application/json" -d '{...order_data...}' | jq -r '.order_id')

# 4. Create payment
curl -X POST "$API_URL/api/payments/razorpay/order?order_id=$ORDER_ID"
```

### Scenario 2: Product Management
```bash
# 1. Create product
PROD_ID=$(curl -s -X POST "$API_URL/api/products" -H "Cookie: session_token=$ADMIN_TOKEN" -d '{...}' | jq -r '.product_id')

# 2. Get product
curl -X GET "$API_URL/api/products/$PROD_ID"

# 3. Update product
curl -X PUT "$API_URL/api/products/$PROD_ID" -H "Cookie: session_token=$ADMIN_TOKEN" -d '{...}'

# 4. Delete product
curl -X DELETE "$API_URL/api/products/$PROD_ID" -H "Cookie: session_token=$ADMIN_TOKEN"
```

---

## 📝 Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 💡 Tips

1. **Save Cookies**: Use `-c cookies.txt` to save and `-b cookies.txt` to send cookies
2. **Pretty Print JSON**: Pipe output to `jq` for formatted JSON
3. **Extract Values**: Use `jq -r '.field'` to extract specific fields
4. **Debug**: Add `-v` flag to see full request/response headers
5. **Time Requests**: Use `time curl ...` to measure API performance

---

## 🔗 Quick Links

- Frontend URL: `http://localhost:3000` (development)
- Backend URL: Check `/app/frontend/.env`
- Database: MongoDB on `localhost:27017`
- Admin Dashboard: `/admin` (requires admin session)

---

## ✅ Health Check
```bash
curl -X GET "$API_URL/api/products" | jq 'length'
# Should return number of products
```

---

**Happy Testing! 🚀**
