import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, User, Menu, X, Headphones } from "lucide-react";
import { API } from "@/App";
import axios from "axios";
import { LanguageSwitcher, useLanguage } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DEFAULT_LOGO = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { settings, getLogoUrl } = useSiteSettings();

  const headerLogo = getLogoUrl(settings?.header_logo) || DEFAULT_LOGO;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        setUser(null);
      }
      
      try {
        const cartResponse = await axios.get(`${API}/cart`, { withCredentials: true });
        const count = cartResponse.data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        setCartCount(count);
      } catch (error) {
        console.error("Error fetching cart:", error);
      }
    };
    
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <Link to="/" className="flex items-center" data-testid="logo-link" aria-label="Paridhaan Creations Home">
            <img 
              src={headerLogo} 
              alt={`${settings?.site_name || "Paridhaan Creations"} - Home`}
              className="h-20 w-auto"
              width="100"
              height="80"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-base font-medium text-gray-700 hover:text-primary transition-colors duration-300" data-testid="nav-home">{t("nav.home")}</Link>
            
            <div className="relative group">
              <Link to="/products" className="text-base font-medium text-gray-700 hover:text-primary transition-colors duration-300 flex items-center" data-testid="nav-products">
                {t("nav.products")}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 rounded-lg" role="menu">
                <Link to="/products?category=handicrafts" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors" data-testid="dropdown-handicrafts" role="menuitem">{t("category.handicrafts")}</Link>
                <Link to="/products?category=pooja" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors" data-testid="dropdown-pooja" role="menuitem">{t("category.pooja")}</Link>
                <Link to="/products?category=perfumes" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors" data-testid="dropdown-perfumes" role="menuitem">{t("category.perfumes")}</Link>
                <Link to="/products?category=jewellery" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors" data-testid="dropdown-jewellery" role="menuitem">{t("category.jewellery")}</Link>
              </div>
            </div>

            <Link to="/support" className="text-base font-medium text-gray-700 hover:text-primary transition-colors duration-300 flex items-center" data-testid="nav-support">
              <Headphones className="w-4 h-4 mr-1" aria-hidden="true" />
              {t("nav.support")}
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            
            <Link to="/cart" className="relative hidden md:block" data-testid="nav-cart" aria-label={`Shopping cart with ${cartCount} items`}>
              <ShoppingCart className="w-6 h-6 text-gray-700 hover:text-primary transition-colors duration-300" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-count" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/wishlist" data-testid="nav-wishlist" aria-label="Wishlist">
                  <Heart className="w-6 h-6 text-gray-700 hover:text-red-500 transition-colors duration-300" aria-hidden="true" />
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700" data-testid="user-menu-button" aria-expanded="false" aria-haspopup="true">
                    <User className="w-6 h-6" aria-hidden="true" />
                    <span className="text-sm font-medium">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 rounded-lg" role="menu">
                    <Link to="/my-orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" data-testid="nav-my-orders" role="menuitem">My Orders</Link>
                    {user.is_admin && (
                      <Link to="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" data-testid="nav-admin" role="menuitem">Admin Dashboard</Link>
                    )}
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50" data-testid="logout-button" role="menuitem" type="button">
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="hidden md:block bg-primary text-white px-6 py-2 font-medium tracking-wide hover:bg-primary/90 transition-all duration-300 rounded" data-testid="login-button">
                Login
              </Link>
            )}

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200" data-testid="mobile-menu">
          <div className="px-4 py-4 space-y-3">
            <Link to="/" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/products" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Products</Link>
            <Link to="/cart" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Cart</Link>
            {user ? (
              <>
                <Link to="/wishlist" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
                <Link to="/my-orders" className="block py-2" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                {user.is_admin && (
                  <Link to="/admin" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Admin Dashboard</Link>
                )}
                <button onClick={handleLogout} className="block py-2 w-full text-left">Logout</button>
              </>
            ) : (
              <Link to="/login" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}