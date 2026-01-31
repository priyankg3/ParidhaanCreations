import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DEFAULT_LOGO = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png";

export default function Footer() {
  const { settings, getLogoUrl } = useSiteSettings();
  const footerLogo = getLogoUrl(settings?.footer_logo) || getLogoUrl(settings?.header_logo) || DEFAULT_LOGO;

  return (
    <footer className="bg-gray-900 text-white mt-24" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="bg-white p-4 rounded mb-4 inline-block">
              <img 
                src={footerLogo} 
                alt={`${settings?.site_name || "Paridhaan Creations"} - Logo`}
                className="h-28 w-auto"
                width="140"
                height="112"
                loading="lazy"
              />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {settings?.tagline || "Traditional Indian handicrafts, pooja items, perfumes, and artificial jewellery."}
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
              <li><Link to="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">Terms & Conditions</Link></li>
            </ul>
          </nav>

          <nav aria-label="Product categories">
            <h3 className="text-lg font-heading font-semibold mb-4 text-white">Categories</h3>
            <ul className="space-y-2">
              <li><Link to="/products?category=handicrafts" className="text-sm text-gray-300 hover:text-white transition-colors">Handicrafts</Link></li>
              <li><Link to="/products?category=pooja" className="text-sm text-gray-300 hover:text-white transition-colors">Pooja Articles</Link></li>
              <li><Link to="/products?category=artificial-jewellery" className="text-sm text-gray-300 hover:text-white transition-colors">Artificial Jewellery</Link></li>
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

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2026 Paridhaan Creations. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
