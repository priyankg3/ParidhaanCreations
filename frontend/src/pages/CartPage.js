import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [cartBanner, setCartBanner] = useState(null);

  useEffect(() => {
    fetchCart();
    fetchCartBanner();
  }, []);

  const fetchCartBanner = async () => {
    try {
      const response = await axios.get(`${API}/banners?placement=cart_page&status=active`);
      if (response.data && response.data.length > 0) {
        setCartBanner(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching cart banner:", error);
    }
  };

  const getImageUrl = (banner) => {
    if (!banner) return '';
    let url = banner.image_desktop || banner.image || '';
    if (url && url.startsWith('/api/')) {
      url = `${API}${url.replace('/api', '')}`;
    }
    return url;
  };

  const handleBannerClick = (banner) => {
    if (banner?.banner_id) {
      axios.post(`${API}/banners/${banner.banner_id}/click`).catch(() => {});
    }
  };

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, { withCredentials: true });
      setCart(response.data);
      
      if (response.data.items && response.data.items.length > 0) {
        const productPromises = response.data.items.map(item =>
          axios.get(`${API}/products/${item.product_id}`)
        );
        const productResponses = await Promise.all(productPromises);
        const productsMap = {};
        productResponses.forEach(res => {
          productsMap[res.data.product_id] = res.data;
        });
        setProducts(productsMap);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await axios.delete(`${API}/cart/remove/${productId}`, { withCredentials: true });
      toast.success("Item removed from cart");
      fetchCart();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await axios.delete(`${API}/cart/remove/${productId}`, { withCredentials: true });
      await axios.post(`${API}/cart/add`, { product_id: productId, quantity: newQuantity }, { withCredentials: true });
      fetchCart();
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const applyCoupon = async () => {
    try {
      const response = await axios.post(`${API}/coupons/validate`, {
        code: couponCode,
        total_amount: subtotal
      });
      setDiscount(response.data.discount);
      toast.success(`Coupon applied! You saved ₹${response.data.discount}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid coupon code");
    }
  };

  const subtotal = cart.items.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const total = Math.max(0, subtotal - discount);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cart Banner - even on empty cart */}
          {cartBanner && (
            <div className="mb-8" data-testid="cart-banner-empty">
              {cartBanner.link ? (
                <Link 
                  to={cartBanner.link} 
                  onClick={() => handleBannerClick(cartBanner)}
                  className="block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
                >
                  <img 
                    src={getImageUrl(cartBanner)} 
                    alt={cartBanner.title || 'Special offer'} 
                    className="w-full h-48 md:h-64 object-cover"
                    loading="lazy"
                  />
                  {cartBanner.title && (
                    <div className="bg-primary/10 p-4 text-center">
                      <p className="font-bold text-primary text-lg">{cartBanner.title}</p>
                    </div>
                  )}
                </Link>
              ) : (
                <div className="overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={getImageUrl(cartBanner)} 
                    alt={cartBanner.title || 'Special offer'} 
                    className="w-full h-48 md:h-64 object-cover"
                    loading="lazy"
                  />
                  {cartBanner.title && (
                    <div className="bg-primary/10 p-4 text-center">
                      <p className="font-bold text-primary text-lg">{cartBanner.title}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
              <h2 className="text-3xl font-heading font-bold mb-4" data-testid="empty-cart-title">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8">Start shopping to add items to your cart</p>
              <Link
                to="/products"
                className="inline-block bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all"
                data-testid="continue-shopping-link"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="cart-title">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const product = products[item.product_id];
              if (!product) return null;

              return (
                <div
                  key={item.product_id}
                  className="bg-white border border-border/40 p-6 flex items-center space-x-6"
                  data-testid={`cart-item-${item.product_id}`}
                >
                  <Link to={`/products/${product.product_id}`} className="flex-shrink-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-24 h-24 object-cover"
                    />
                  </Link>

                  <div className="flex-grow">
                    <Link to={`/products/${product.product_id}`}>
                      <h3 className="text-xl font-heading font-semibold mb-2 hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-lg font-bold text-accent mb-3">₹{product.price}</p>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="bg-background-paper p-2 hover:bg-primary hover:text-white transition-all"
                        data-testid={`decrease-qty-${item.product_id}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-medium w-12 text-center" data-testid={`qty-${item.product_id}`}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="bg-background-paper p-2 hover:bg-primary hover:text-white transition-all"
                        data-testid={`increase-qty-${item.product_id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-4">
                    <p className="text-xl font-bold" data-testid={`item-total-${item.product_id}`}>
                      ₹{(product.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-accent hover:text-accent/80 transition-colors"
                      data-testid={`remove-${item.product_id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-border/40 p-6 sticky top-24">
              <h2 className="text-2xl font-heading font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span>Subtotal</span>
                  <span data-testid="subtotal">₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-lg text-green-600">
                    <span>Discount</span>
                    <span data-testid="discount">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span className="text-accent" data-testid="total">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Have a coupon?</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    data-testid="coupon-input"
                  />
                  <button
                    onClick={applyCoupon}
                    className="bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-all"
                    data-testid="apply-coupon-button"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full bg-primary text-primary-foreground py-4 font-medium tracking-wide hover:bg-primary/90 transition-all duration-300"
                data-testid="checkout-button"
              >
                Proceed to Checkout
              </button>

              <Link
                to="/products"
                className="block text-center mt-4 text-primary hover:text-primary/80 transition-colors"
                data-testid="continue-shopping-button"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Cart Page Banner */}
            {cartBanner && (
              <div className="mt-6" data-testid="cart-banner">
                {cartBanner.link ? (
                  <Link 
                    to={cartBanner.link} 
                    onClick={() => handleBannerClick(cartBanner)}
                    className="block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
                  >
                    <img 
                      src={getImageUrl(cartBanner)} 
                      alt={cartBanner.title || 'Special offer'} 
                      className="w-full h-48 md:h-64 object-cover"
                      loading="lazy"
                    />
                    {cartBanner.title && (
                      <div className="bg-primary/10 p-4 text-center">
                        <p className="font-bold text-primary text-lg">{cartBanner.title}</p>
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="overflow-hidden rounded-lg shadow-md">
                    <img 
                      src={getImageUrl(cartBanner)} 
                      alt={cartBanner.title || 'Special offer'} 
                      className="w-full h-48 md:h-64 object-cover"
                      loading="lazy"
                    />
                    {cartBanner.title && (
                      <div className="bg-primary/10 p-4 text-center">
                        <p className="font-bold text-primary text-lg">{cartBanner.title}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
