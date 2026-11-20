import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import SEO from "@/components/SEO";
import { 
  Trash2, Plus, Minus, ShoppingBag, Truck, RefreshCw, Shield, Clock, 
  Tag, ChevronRight, Package, Gift, CreditCard, Smartphone, CheckCircle,
  Sparkles, Heart, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [cartBanner, setCartBanner] = useState(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  // Contact capture for abandoned cart recovery
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const bannerPromise = fetchCartBanner();
      const cartPromise = fetchCart();
      await Promise.all([bannerPromise, cartPromise]);
    };
    fetchAll();
  }, []);

  const fetchCartBanner = async () => {
    try {
      const response = await axios.get(`${API}/banners?placement=cart_page&status=active`);
      if (response.data && response.data.length > 0) {
        setCartBanner(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching cart banner:", error);
    } finally {
      setBannerLoading(false);
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
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      const response = await axios.post(`${API}/coupons/validate`, {
        code: couponCode.toUpperCase(),
        total_amount: subtotal
      });
      setDiscount(response.data.discount);
      setAppliedCoupon(couponCode.toUpperCase());
      toast.success(`Coupon applied! You saved ₹${response.data.discount}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const subtotal = cart.items.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const freeDeliveryThreshold = 499;
  const deliveryCharge = subtotal >= freeDeliveryThreshold ? 0 : 49;
  const total = Math.max(0, subtotal - discount + deliveryCharge);
  const savings = discount;
  const amountForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  if (loading || bannerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-12">
        <SEO title="Shopping Cart" noindex={true} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cart Banner */}
          {cartBanner && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg" data-testid="cart-banner-empty">
              {cartBanner.link ? (
                <Link to={cartBanner.link} onClick={() => handleBannerClick(cartBanner)}>
                  <img src={getImageUrl(cartBanner)} alt={cartBanner.title || 'Special offer'} 
                    className="w-full h-48 md:h-64 object-cover" loading="lazy" />
                </Link>
              ) : (
                <img src={getImageUrl(cartBanner)} alt={cartBanner.title || 'Special offer'} 
                  className="w-full h-48 md:h-64 object-cover" loading="lazy" />
              )}
            </div>
          )}
          
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-orange-400" />
                </div>
                <div className="absolute -top-2 -right-8 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center animate-bounce">
                  <Heart className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3" data-testid="empty-cart-title">Your cart is empty</h2>
              <p className="text-gray-500 mb-8 text-lg">Discover our beautiful collection of handicrafts and traditional items!</p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                data-testid="continue-shopping-link"
              >
                <ShoppingBag className="w-5 h-5" />
                Start Shopping
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" data-testid="cart-title">
            Shopping Cart
          </h1>
          <p className="text-gray-500 mt-2">{cart.items.length} item{cart.items.length > 1 ? 's' : ''} in your cart</p>
        </div>

        {/* Free Delivery Progress */}
        {subtotal < freeDeliveryThreshold && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Add <span className="font-bold text-blue-600">₹{amountForFreeDelivery.toFixed(0)}</span> more for FREE Delivery!
              </p>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {subtotal >= freeDeliveryThreshold && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              🎉 Congratulations! You've unlocked <span className="font-bold">FREE Delivery</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Cart Page Banner - At top of cart items section */}
            {cartBanner && (
              <div className="rounded-2xl overflow-hidden shadow-lg mb-2" data-testid="cart-banner">
                {cartBanner.link ? (
                  <Link to={cartBanner.link} onClick={() => handleBannerClick(cartBanner)}>
                    <img src={getImageUrl(cartBanner)} alt={cartBanner.title || 'Special offer'} 
                      className="w-full h-32 md:h-44 object-cover hover:scale-[1.02] transition-transform duration-300" loading="lazy" />
                  </Link>
                ) : (
                  <img src={getImageUrl(cartBanner)} alt={cartBanner.title || 'Special offer'} 
                    className="w-full h-32 md:h-44 object-cover" loading="lazy" />
                )}
              </div>
            )}
            
            {cart.items.map((item, index) => {
              const product = products[item.product_id];
              if (!product) return null;

              return (
                <div
                  key={item.product_id}
                  className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                  data-testid={`cart-item-${item.product_id}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
                    {/* Product Image */}
                    <Link to={`/products/${product.product_id}`} className="flex-shrink-0 group">
                      <div className="w-full md:w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </Link>

                    {/* Product Details */}
                    <div className="flex-grow min-w-0">
                      <Link to={`/products/${product.product_id}`}>
                        <h3 className="text-lg font-semibold text-gray-800 hover:text-orange-600 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {/* Product badges/info */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.laddu_gopal_size && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {product.laddu_gopal_size}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          In Stock
                        </span>
                      </div>
                      
                      <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mt-2">
                        ₹{product.price.toLocaleString()}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center bg-gray-100 rounded-full">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-200 rounded-l-full transition-colors"
                            data-testid={`decrease-qty-${item.product_id}`}
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className="px-4 text-lg font-semibold" data-testid={`qty-${item.product_id}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-200 rounded-r-full transition-colors"
                            data-testid={`increase-qty-${item.product_id}`}
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          data-testid={`remove-${item.product_id}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start">
                      <p className="text-sm text-gray-500">Item Total</p>
                      <p className="text-xl font-bold text-gray-800" data-testid={`item-total-${item.product_id}`}>
                        ₹{(product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Continue Shopping */}
            <Link
              to="/products"
              className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border-2 border-dashed border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add More Items</span>
            </Link>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden sticky top-24">
              
              {/* Summary Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Summary
                </h2>
              </div>

              <div className="p-6 space-y-4">
                
                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.items.length} items)</span>
                    <span data-testid="subtotal">₹{subtotal.toLocaleString()}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        Discount
                      </span>
                      <span data-testid="discount">-₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={subtotal >= freeDeliveryThreshold ? "text-green-600 font-medium" : ""}>
                      {subtotal >= freeDeliveryThreshold ? "FREE" : "₹49"}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">Total</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" data-testid="total">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-sm text-green-600 text-right mt-1">
                        You're saving ₹{savings.toLocaleString()}!
                      </p>
                    )}
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Have a coupon?</label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="font-mono font-bold text-green-700">{appliedCoupon}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-sm font-medium">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase"
                        data-testid="coupon-input"
                      />
                      <button
                        onClick={applyCoupon}
                        className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                        data-testid="apply-coupon-button"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact Capture */}
                {!contactSaved && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Get notified about offers!
                      </p>
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="Your email (optional)"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          data-testid="guest-email-input"
                        />
                        <input
                          type="tel"
                          placeholder="WhatsApp number (optional)"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          data-testid="guest-phone-input"
                        />
                        <button
                          onClick={async () => {
                            if (!guestEmail && !guestPhone) {
                              toast.info("Please enter email or phone");
                              return;
                            }
                            try {
                              await axios.post(`${API}/cart/save-contact`, null, {
                                params: { guest_email: guestEmail, guest_phone: guestPhone },
                                withCredentials: true
                              });
                              setContactSaved(true);
                              toast.success("Saved! We'll keep you updated 🙏");
                            } catch (error) {
                              console.error("Error saving contact:", error);
                            }
                          }}
                          className="w-full py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                          data-testid="save-contact-button"
                        >
                          Save & Get Updates
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {contactSaved && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      We'll send you updates!
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={() => navigate("/checkout")}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  data-testid="checkout-button"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800">Free Delivery</p>
                        <p className="text-[10px] text-blue-600">Above ₹499</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <RefreshCw className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">Easy Returns</p>
                        <p className="text-[10px] text-green-600">7 Days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                      <Shield className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-800">100% Secure</p>
                        <p className="text-[10px] text-purple-600">Payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-800">Fast Refund</p>
                        <p className="text-[10px] text-orange-600">7-10 Days</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Razorpay Trust Badge */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">100% Secure Payments</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">Powered by</span>
                      <div className="flex items-center">
                        <span className="text-lg font-bold" style={{ color: '#072654' }}>Razor</span>
                        <span className="text-lg font-bold" style={{ color: '#3395FF' }}>pay</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>UPI</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Wallets</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        <span>Net Banking</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Policy Links - Fixed Position */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center mb-2">By proceeding, you agree to our:</p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <Link to="/refund-policy" className="text-orange-600 hover:underline font-medium">
                      Refund Policy
                    </Link>
                    <span className="text-gray-300">•</span>
                    <Link to="/shipping-policy" className="text-orange-600 hover:underline font-medium">
                      Shipping Policy
                    </Link>
                    <span className="text-gray-300">•</span>
                    <Link to="/terms" className="text-orange-600 hover:underline font-medium">
                      Terms & Conditions
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
