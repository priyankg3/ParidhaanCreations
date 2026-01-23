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

## Features Implemented

### Core E-commerce
- [x] Product & Category Management
- [x] Cart & Checkout Flow with Razorpay
- [x] Product reviews and ratings
- [x] Product badges (New Arrival)
- [x] PDF Invoice Generation
- [x] Product Recommendations

### Payment Options (via Razorpay)
- [x] UPI Payment (Google Pay, PhonePe, Paytm, BHIM)
- [x] Credit/Debit Card (Visa, Mastercard, Rupay)
- [x] Net Banking (50+ banks)

### Admin Dashboard (/admin)
- [x] Analytics with charts
- [x] Customer Insights
- [x] Products management
- [x] Categories management
- [x] Orders management
- [x] Support Tickets management
- [x] Banners management
- [x] Coupons management
- [x] Stock Alerts

### Customer Features
- [x] Google Social Login
- [x] Wishlist
- [x] Order tracking
- [x] **Support Ticket System** - Create and track tickets
- [x] **WhatsApp Support** - Floating chat button (+91 9871819508)
- [x] **Multi-language** - English & Hindi

### Coupons & Discounts
- [x] SAVE10 (10% off)
- [x] FLAT100 (₹100 off)
- [x] SAVE20 (20% off)
- [x] WELCOME10 (10% off first order)
- [x] First-time buyer auto-detection

### SEO
- [x] robots.txt
- [x] JSON-LD structured data
- [x] Dynamic meta tags
- [x] Sitemap generation

## API Endpoints

### Support Tickets
- POST /api/support/tickets - Create ticket
- GET /api/support/tickets - Get user's tickets
- GET /api/support/tickets/{id} - Get ticket details
- POST /api/support/tickets/{id}/reply - Reply to ticket
- PUT /api/support/tickets/{id}/status - Update status (admin)
- GET /api/admin/support/tickets - All tickets (admin)
- GET /api/admin/support/stats - Ticket statistics (admin)

### Stock Management
- GET /api/admin/stock-alerts - Low stock products (admin)
- PUT /api/admin/products/{id}/restock - Add stock (admin)

### WhatsApp
- GET /api/config/whatsapp - WhatsApp configuration

## WhatsApp Integration
- **Business Number:** +91 9871819508
- Floating chat button on all pages (except admin)
- Order help link on order success page
- Support page WhatsApp option

## Multi-language Support
- **Languages:** English (en), Hindi (hi)
- Language switcher in navbar
- Persisted in localStorage
- Translations for navigation, products, cart, checkout, support

## Completed in Latest Session (Jan 2026)
1. Payment UI - UPI options (GPay, PhonePe, Paytm, BHIM)
2. Advanced SEO - robots.txt, JSON-LD
3. First-time buyer WELCOME10 discount
4. Admin access locked to priyankg3@gmail.com
5. **Customer Support Ticketing System**
6. **WhatsApp Chat Integration** (+91 9871819508)
7. **Multi-language Support** (English/Hindi)
8. **Stock Replenishment Alerts** in admin

## Notes
- All payments via Razorpay
- Admin access email-locked to priyankg3@gmail.com
- WhatsApp opens in new tab with pre-filled message
