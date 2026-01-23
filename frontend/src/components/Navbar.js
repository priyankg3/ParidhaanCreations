import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, User, Menu, X, Search } from "lucide-react";
import { API } from "@/App";
import axios from "axios";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    getCartCount();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const getCartCount = async () => {
    try {
      const response = await axios.get(`${API}/cart`, { withCredentials: true });
      const count = response.data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      setCartCount(count);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <img 
              src="https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png" 
              alt="Paridhaan Creations" 
              className="h-16 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-base font-medium hover:text-primary transition-colors duration-300" data-testid="nav-home">Home</Link>
            <Link to="/products" className="text-base font-medium hover:text-primary transition-colors duration-300" data-testid="nav-products">Products</Link>
            <Link to="/products?category=handicrafts" className="text-base font-medium hover:text-primary transition-colors duration-300">Handicrafts</Link>
            <Link to="/products?category=pooja" className="text-base font-medium hover:text-primary transition-colors duration-300">Pooja Items</Link>
            <Link to="/products?category=perfumes" className="text-base font-medium hover:text-primary transition-colors duration-300">Perfumes</Link>
            <Link to="/products?category=jewellery" className="text-base font-medium hover:text-primary transition-colors duration-300">Jewellery</Link>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/wishlist" data-testid="nav-wishlist">
                  <Heart className="w-6 h-6 hover:text-accent transition-colors duration-300" />
                </Link>
                <Link to="/cart" className="relative" data-testid="nav-cart">
                  <ShoppingCart className="w-6 h-6 hover:text-primary transition-colors duration-300" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-count">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2" data-testid="user-menu-button">
                    <User className="w-6 h-6" />
                    <span className="text-sm font-medium">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <Link to="/my-orders" className="block px-4 py-2 hover:bg-background-paper" data-testid="nav-my-orders">My Orders</Link>
                    {user.is_admin && (
                      <Link to="/admin" className="block px-4 py-2 hover:bg-background-paper" data-testid="nav-admin">Admin Dashboard</Link>
                    )}
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-background-paper" data-testid="logout-button">
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="hidden md:block bg-primary text-primary-foreground px-6 py-2 font-medium tracking-wide hover:bg-primary/90 transition-all duration-300" data-testid="login-button">
                Login
              </Link>
            )}

            <button
              className="md:hidden"
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