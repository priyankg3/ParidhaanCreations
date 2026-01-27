import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DEFAULT_LOGO = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png";

export default function Footer() {
  const { settings, getLogoUrl } = useSiteSettings();
  const footerLogo = getLogoUrl(settings?.footer_logo) || getLogoUrl(settings?.header_logo) || DEFAULT_LOGO;

  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="bg-white p-4 rounded mb-4 inline-block">
              <img 
                src={footerLogo} 
                alt={settings?.site_name || "Paridhaan Creations"} 
                className="h-28 w-auto"
              />
            </div>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              {settings?.tagline || "Traditional Indian handicrafts, pooja items, perfumes, and artificial jewellery."}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-secondary">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm hover:text-secondary transition-colors">Home</Link></li>
              <li><Link to="/products" className="text-sm hover:text-secondary transition-colors">Products</Link></li>
              <li><Link to="/cart" className="text-sm hover:text-secondary transition-colors">Cart</Link></li>
              <li><Link to="/my-orders" className="text-sm hover:text-secondary transition-colors">My Orders</Link></li>
              <li><Link to="/support" className="text-sm hover:text-secondary transition-colors">Support</Link></li>
              <li><Link to="/terms" className="text-sm hover:text-secondary transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-secondary">Categories</h3>
            <ul className="space-y-2">
              <li><Link to="/products?category=handicrafts" className="text-sm hover:text-secondary transition-colors">Handicrafts</Link></li>
              <li><Link to="/products?category=pooja" className="text-sm hover:text-secondary transition-colors">Pooja Articles</Link></li>
              <li><Link to="/products?category=perfumes" className="text-sm hover:text-secondary transition-colors">Perfumes</Link></li>
              <li><Link to="/products?category=jewellery" className="text-sm hover:text-secondary transition-colors">Jewellery</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-secondary">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>India</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href="mailto:info@paridhaancreations.xyz" className="hover:text-secondary transition-colors">
                  info@paridhaancreations.xyz
                </a>
              </li>
            </ul>
            <div className="flex space-x-4 mt-6">
              <a 
                href="https://www.facebook.com/share/1HP4DzfcFi/" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 hover:text-secondary cursor-pointer transition-colors" />
              </a>
              <a 
                href="https://www.instagram.com/paridhaancreations?igsh=eHFpbmZxMmUzYTIx" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 hover:text-secondary cursor-pointer transition-colors" />
              </a>
              <a 
                href="https://wa.me/message/4TZ5RAVABY4HG1" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5 hover:text-secondary cursor-pointer transition-colors" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm text-primary-foreground/70">
          <p>&copy; 2026 Paridhaan Creations. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}