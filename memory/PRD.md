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

## Domain & Deployment
- **Domain:** paridhaancreations.xyz (ready to connect)
- **Deploy:** Click Deploy in Emergent → Link Domain → Remove A records → Follow Entri setup

## Admin Access
- **Admin Email:** priyankg3@gmail.com (ONLY this email has admin access)
- Admin link appears in navbar dropdown when logged in
- Admin dashboard accessible at `/admin`

## Social Links & Contact
- **Email:** info@paridhaancreations.xyz
- **Instagram:** https://www.instagram.com/paridhaancreations
- **Facebook:** https://www.facebook.com/share/1HP4DzfcFi/
- **WhatsApp:** https://wa.me/message/4TZ5RAVABY4HG1 (+91 9871819508)

## Features Implemented

### Core E-commerce
- [x] Product & Category Management
- [x] **Product Image Upload** - Direct file upload in Admin Dashboard
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
- [x] Products management with **image upload**
- [x] Categories management
- [x] Orders management
- [x] Support Tickets management
- [x] **Banners management** - header/footer/side + category targeting
- [x] Coupons management
- [x] Stock Alerts

### Banner System (Fully Implemented - 9 Placements)
All 9 banner placements are fully functional with JPEG/PNG support:

| Placement | Location | Recommended Size | Status |
|-----------|----------|-----------------|--------|
| hero | Homepage slider | 1920x600 px | ✅ Working (2 banners) |
| below_hero | Below homepage slider | 1200x400 px | ✅ Working |
| popup | Homepage modal popup | 600x400 px | ✅ Working |
| category_header | Category page top | 1200x250 px | ✅ Working (4 banners) |
| category_sidebar | Category sidebar | 300x600 px | ✅ Working (5 banners) |
| category_footer | Category page bottom | 1200x100 px | ✅ Working (4 banners) |
| product_page | Product detail page | 800x200 px | ✅ Working (1 banner) |
| cart_page | Cart page sidebar | 800x150 px | ✅ Working |
| checkout_page | Checkout offers | 600x100 px | ✅ Working |

**Features:**
- **Image Upload:** Direct file upload via Admin Dashboard
- **Category Targeting:** Assign banners to specific product categories
- **Scheduling:** Set start/end dates for automatic activation
- **Tracking:** Impression and click analytics
- **Responsive:** Desktop and mobile image variants
- **Lazy Loading:** Optimized loading for better performance

### Customer Features
- [x] Google Social Login
- [x] Wishlist
- [x] Order tracking
- [x] Support Ticket System
- [x] WhatsApp Support
- [x] Multi-language (English & Hindi)

### SEO
- [x] robots.txt
- [x] JSON-LD structured data
- [x] Dynamic meta tags
- [x] Sitemap generation

## API Endpoints (New)

### File Upload
- POST /api/upload/image - Upload single image (admin)
- POST /api/upload/images - Upload multiple images (admin)
- GET /api/uploads/{filename} - Get uploaded file
- DELETE /api/upload/{filename} - Delete file (admin)

### Banners
- GET /api/banners?banner_type=header&category=handicrafts
- POST /api/banners - Create banner with type/category
- DELETE /api/banners/{id}

## Completed in Latest Session (Jan 2026)
1. **Category Banners Created:** 12 banners (header/side/footer for all 4 categories)
2. **Product Image Upload:** Direct file upload in Admin Dashboard
3. **Footer Social Links:** Instagram, Facebook, WhatsApp (no phone number)
4. **All 4 categories displaying** on homepage
5. **Banner Image Upload (NEW):** Added file upload option for banners with size recommendations
   - Upload area with drag-drop styling
   - URL input as alternative option
   - Image preview with remove button
   - Size recommendations panel (1920x600 Home, 1200x250 Category Top, 300x600 Sidebar, 1200x100 Footer)
6. **Banner Scheduling (NEW):** Schedule banners for festivals/sales
   - Start/End date pickers in banner form
   - Automatic activation based on schedule
   - Schedule status badges (Always Active, Scheduled, Currently Active, Expired)
   - Public banners API filters out non-scheduled banners automatically

## Deployment Instructions
1. Click "Preview" to test your application
2. Click "Deploy" → "Deploy Now"
3. Wait 10-15 minutes for deployment
4. Click "Link Domain" → Enter "paridhaancreations.xyz"
5. Click "Entri" and follow instructions
6. **Important:** Remove all A records from your domain DNS settings
7. Wait 5-15 minutes for DNS propagation

## Notes
- All payments via Razorpay
- Admin access email-locked to priyankg3@gmail.com
- Deployment costs 50 credits/month
- Images stored in /app/backend/uploads/
