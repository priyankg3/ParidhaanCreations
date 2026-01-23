# Paridhaan Creations - E-commerce Platform

## Original Problem Statement
Build a full-featured e-commerce website named "Paridhaan Creations" for selling:
- Handicrafts
- Pooja articles
- Perfumes
- Artificial jewellery
- Traditional & decorative items

## Tech Stack
- **Frontend:** React, React Router, Tailwind CSS, Recharts, Axios
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB driver)
- **Database:** MongoDB
- **Payments:** Razorpay (UPI, Cards, Net Banking)
- **Auth:** Google OAuth (via Emergent)

## Admin Access
- **Admin Email:** priyankg3@gmail.com (ONLY this email has admin access)
- Admin link appears in navbar dropdown when logged in
- Admin dashboard accessible at `/admin`

## Core Requirements

### Frontend
- [x] Clean, elegant, traditional-modern design
- [x] Homepage with hero banner slider, promotional sections, featured products
- [x] Product listing pages with filters (price, category) and search
- [x] Product detail pages with images, description, price, availability
- [x] Add to cart & Buy Now functionality
- [x] User features: Signup/login (Google), Wishlist, Order tracking
- [x] Fully responsive design

### Backend/Admin
- [x] Admin dashboard to manage products (add, edit, delete, multiple images)
- [x] Category management
- [x] Banner/ads management
- [x] Order management (pending, shipped, delivered)
- [x] Coupon/discount management (CRUD + checkout integration)
- [x] Inventory management with low-stock alerts
- [x] Analytics dashboard (orders, revenue, popular products)
- [x] Customer insights & segmentation

### Checkout & Payments
- [x] Full cart and checkout system
- [x] Razorpay integration with UPI (GPay, PhonePe, Paytm, BHIM)
- [x] Credit/Debit Card payments
- [x] Net Banking payments
- [x] Guest checkout option
- [x] Coupon code application at checkout
- [x] First-time buyer welcome discount (WELCOME10)

### SEO
- [x] Dynamic meta tags (Open Graph, Twitter Cards)
- [x] robots.txt
- [x] JSON-LD structured data (Organization, Website, Product, Breadcrumb)
- [x] Sitemap generation

## What's Implemented

### Core E-commerce Platform
- Full-stack application (FastAPI + React + MongoDB)
- User Authentication: Google Social Login
- Product & Category Management
- Cart & Checkout Flow with Razorpay
- Product reviews and ratings system
- Product badges (e.g., 'New Arrival')
- PDF Invoice Generation
- Basic Product Recommendation Engine

### Admin Dashboard (/admin)
- Analytics tab with charts (sales trends, revenue by category)
- Customer Insights & Segmentation tab
- Products management (CRUD, Export CSV)
- Categories management
- Orders management with status updates
- Banners management
- Coupons management - Full CRUD with listing table
- Notification Settings UI
- Bulk Product Import/Export

### Payment Options (via Razorpay)
- UPI Payment (Google Pay, PhonePe, Paytm, BHIM) - Recommended
- Credit/Debit Card (Visa, Mastercard, Rupay)
- Net Banking (50+ banks)

### SEO & Technical
- robots.txt for search engines
- JSON-LD structured data
- Dynamic meta tags
- Sitemap generation

### First-Time Buyer Feature
- WELCOME10 coupon (10% off)
- Auto-detection of first-time buyers
- Welcome banner on checkout page
- One-click apply welcome coupon

## API Endpoints

### Authentication
- POST /api/auth/session - Create session from Google OAuth
- GET /api/auth/me - Get current user
- POST /api/auth/logout - Logout

### Products
- GET /api/products - List all products
- GET /api/products/{id} - Get product details
- POST /api/products - Create product (admin)
- DELETE /api/products/{id} - Delete product (admin)

### Orders
- POST /api/orders - Create order
- GET /api/orders/{id}/invoice - Download PDF invoice

### Coupons
- GET /api/coupons - List all coupons (admin)
- POST /api/coupons - Create coupon (admin)
- PUT /api/coupons/{id} - Update coupon (admin)
- DELETE /api/coupons/{id} - Delete coupon (admin)
- POST /api/coupons/validate - Validate coupon code (public)

### User
- GET /api/user/first-time-buyer - Check first-time buyer status

### Payments
- POST /api/payments/razorpay/order - Create Razorpay order
- POST /api/payments/razorpay/verify - Verify payment

## Available Coupons
| Code | Discount | Status |
|------|----------|--------|
| SAVE10 | 10% OFF | Active |
| FLAT100 | ₹100 OFF | Active |
| SAVE20 | 20% OFF | Active |
| WELCOME10 | 10% OFF (first-time buyers) | Active |

## Completed in Latest Session (Jan 2026)
1. **Coupon Management** - Full CRUD with admin UI and checkout integration
2. **Payment UI Update** - Replaced Stripe with UPI options (GPay, PhonePe, Paytm, BHIM)
3. **Advanced SEO** - robots.txt, JSON-LD structured data
4. **First-Time Buyer Feature** - WELCOME10 auto-discount for new customers
5. **Admin Access Control** - Only priyankg3@gmail.com has admin access

## Notes
- All payments go through Razorpay
- Admin access is email-locked to priyankg3@gmail.com
- WELCOME10 coupon auto-shows for first-time buyers at checkout
