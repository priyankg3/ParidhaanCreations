import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DEFAULT_LOGO = "/logo-header.png";
const FOOTER_LOGO = "/logo-footer-v3.png";

// WhatsApp QR Code (wa.me link encoded)
const WHATSAPP_QR = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/message/4TZ5RAVABY4HG1&bgcolor=ffffff&color=EA580C";

// Payment brand badges — rendered as inline brand-coloured text so we never
// hotlink a third-party image URL (which was 404-ing in production).
// Each entry describes a small pill the Footer draws itself; `component`
// returns the inner content.
const PaymentBadge = ({ label, color, bg = "bg-white", font = "font-bold" }) => (
  <div className={`${bg} px-3 py-2 rounded-lg shadow h-10 flex items-center justify-center min-w-[64px]`}>
    <span className={`${font} text-sm tracking-tight`} style={{ color }}>{label}</span>
  </div>
);

const PAYMENT_BADGES = [
  { key: "visa",       render: () => <PaymentBadge label="VISA"       color="#1A1F71" /> },
  { key: "mastercard", render: () => (
    <div className="bg-white px-3 py-2 rounded-lg shadow h-10 flex items-center gap-0.5">
      <span className="w-4 h-4 rounded-full" style={{ background: "#EB001B" }} />
      <span className="w-4 h-4 rounded-full -ml-1.5 mix-blend-multiply" style={{ background: "#F79E1B" }} />
    </div>
  )},
  { key: "upi",        render: () => <PaymentBadge label="UPI" color="#0F8A4A" /> },
  { key: "phonepe",    render: () => (
    <div className="bg-[#5F259F] px-3 py-2 rounded-lg shadow h-10 flex items-center justify-center min-w-[72px]">
      <span className="text-white font-bold text-sm">PhonePe</span>
    </div>
  )},
  { key: "rupay",      render: () => (
    <div className="bg-white px-3 py-2 rounded-lg shadow h-10 flex items-center gap-1">
      <span className="font-extrabold text-sm" style={{ color: "#0071BC" }}>Ru</span>
      <span className="font-extrabold text-sm" style={{ color: "#F37021" }}>Pay</span>
    </div>
  )},
];

export default function Footer() {
  const { settings, getLogoUrl } = useSiteSettings();
  const footerLogo = getLogoUrl(settings?.footer_logo) || getLogoUrl(settings?.header_logo) || DEFAULT_LOGO;

  return (
    <footer className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white mt-24" role="contentinfo">
      {/* Divine Border Top */}
      <div className="h-2 bg-gradient-to-r from-[#8B1538] via-[#D4AF37] to-[#8B1538]"></div>
      
      {/* Quote Banner */}
      <div className="bg-[#8B1538]/20 py-4 text-center border-b border-[#D4AF37]/20">
        <p className="text-[#D4AF37] text-lg font-medium tracking-wide">
          "Connecting you to the divine, Tradition Delivered." ✨
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="mb-4">
              <img 
                src={FOOTER_LOGO} 
                alt={`${settings?.site_name || "Paridhaan Creations"} - Logo`}
                className="h-32 md:h-40 w-auto object-contain"
                style={{ mixBlendMode: 'screen', backgroundColor: 'transparent' }}
                loading="lazy"
              />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              {settings?.tagline || "Traditional & Handicraft Store"}
            </p>
          </div>

          <nav aria-label="Quick links">
            <h3 className="text-lg font-heading font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-gray-300 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="text-sm text-gray-300 hover:text-white transition-colors">Products</Link></li>
              <li><Link to="/cart" className="text-sm text-gray-300 hover:text-white transition-colors">Cart</Link></li>
              <li><Link to="/my-orders" className="text-sm text-gray-300 hover:text-white transition-colors">My Orders</Link></li>
              <li><Link to="/support" className="text-sm text-gray-300 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </nav>

          <nav aria-label="Policies">
            <h3 className="text-lg font-heading font-semibold mb-4 text-white">Policies</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="text-sm text-gray-300 hover:text-white transition-colors">Cancellation & Refund</Link></li>
              <li><Link to="/shipping-policy" className="text-sm text-gray-300 hover:text-white transition-colors">Shipping & Returns</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-white">Contact Us</h3>
            <address className="not-italic">
              <ul className="space-y-3">
                <li className="flex items-start space-x-2 text-sm text-gray-300">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>India</span>
                </li>
                <li className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <a href="mailto:info@paridhaancreations.xyz" className="text-gray-300 hover:text-white transition-colors">
                    info@paridhaancreations.xyz
                  </a>
                </li>
              </ul>
            </address>
            <div className="flex space-x-4 mt-6">
              <a 
                href="https://www.facebook.com/share/1HP4DzfcFi/" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Follow us on Facebook"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <Facebook className="w-6 h-6" aria-hidden="true" />
              </a>
              <a 
                href="https://www.instagram.com/paridhaancreations?igsh=eHFpbmZxMmUzYTIx" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <Instagram className="w-6 h-6" aria-hidden="true" />
              </a>
              <a 
                href="https://wa.me/message/4TZ5RAVABY4HG1" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Contact us on WhatsApp"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <MessageCircle className="w-6 h-6" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* WhatsApp QR, Payment Protection & Available On Section */}
        <div className="border-t border-gray-700 mt-12 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* WhatsApp QR Code */}
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Scan QR to Connect</h4>
              <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
                <img 
                  src={WHATSAPP_QR} 
                  alt="WhatsApp QR Code" 
                  className="w-32 h-32 md:w-40 md:h-40"
                  loading="lazy"
                />
              </div>
              <p className="text-sm text-gray-400 mt-3 flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                Connect with us on WhatsApp
              </p>
            </div>

            {/* Payment Protection */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-lg font-semibold">PAYMENT</span>
                <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  100% Payment Protection
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {PAYMENT_BADGES.map((badge) => (
                  <div key={badge.key} aria-label={badge.key}>
                    {badge.render()}
                  </div>
                ))}
              </div>
            </div>

            {/* Available On */}
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Also Available On</h4>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-white px-4 py-2 rounded-lg shadow h-10 flex items-center">
                  <span className="text-[#F43397] font-bold text-sm tracking-tight">meesho</span>
                </div>
                <div className="bg-[#232F3E] px-4 py-2 rounded-lg shadow h-10 flex items-end gap-0.5">
                  <span className="text-white font-bold text-sm tracking-tight">amazon</span>
                  <span className="text-[#FF9900] font-bold text-sm leading-none">.in</span>
                </div>
                <div className="bg-[#2874f0] px-4 py-2 rounded-lg shadow h-10 flex items-center gap-1">
                  <span className="text-white font-bold text-sm">Flipkart</span>
                  <span className="text-[#FFE500] font-bold text-sm">✓</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Shop from your favorite platform</p>
            </div>
          </div>
        </div>

        {/* SEO Content Section - Keyword-rich Internal Links */}
        <div className="border-t border-gray-700 mt-10 pt-8">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white mb-3">Your Trusted Store for Handicrafts & Pooja Articles Online</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Welcome to <strong>Paridhaan Creations</strong>, your premier online destination for authentic Indian handicrafts, brass pooja articles, laddu gopal dresses, and traditional temple decor. 
              We bring the divine essence of <strong>Vrindavan and Barsana</strong> to your doorstep with handcrafted pooja samagri, agarbatti, dhoop batti, camphor, aarti thali sets, and decorative items. 
              Whether you are looking for <strong>brass pooja thali</strong>, <strong>laddu gopal shringar</strong>, or <strong>temple decoration items</strong>, we have a wide collection handcrafted by skilled artisans. 
              Enjoy <strong>free shipping on orders above Rs.999</strong> with Cash on Delivery available across India.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { text: "Brass Pooja Thali", link: "/products?category=pooja" },
              { text: "Laddu Gopal Dress", link: "/products?category=pooja" },
              { text: "Incense Sticks", link: "/products?category=pooja" },
              { text: "Temple Decoration", link: "/products?category=handicrafts" },
              { text: "Aarti Thali Set", link: "/products?category=pooja" },
              { text: "Pooja Samagri", link: "/products?category=pooja" },
              { text: "Handmade Crafts", link: "/products?category=handicrafts" },
              { text: "God Dress Online", link: "/products?category=pooja" },
              { text: "Dhoop Batti", link: "/products?category=pooja" },
              { text: "Camphor", link: "/products?category=pooja" },
              { text: "Pooja Bell", link: "/products?category=pooja" },
              { text: "Free Astrology", link: "/astro" },
              { text: "Daily Rashifal", link: "/astro" },
            ].map((tag) => (
              <Link 
                key={tag.text} 
                to={tag.link} 
                className="text-xs text-gray-400 hover:text-[#D4AF37] transition-colors border border-gray-700 rounded-full px-3 py-1"
              >
                {tag.text}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[#D4AF37]/30 mt-4 pt-8 text-center">
          <p className="text-[#D4AF37] font-['Noto_Sans_Devanagari'] mb-2">🙏 राधे राधे 🙏</p>
          <p className="text-sm text-gray-400">&copy; 2026 Paridhaan Creations. All rights reserved.</p>
          <p className="text-xs text-gray-500 mt-1">Made with ❤️ for devotees of Radha-Krishna</p>
        </div>
      </div>
    </footer>
  );
}
