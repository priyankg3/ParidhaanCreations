import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { useRazorpay } from "react-razorpay";
import { Check, CreditCard, Smartphone, MapPin, Package, ShieldCheck, Truck, Tag, X, ChevronRight } from "lucide-react";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { error, isLoading, Razorpay } = useRazorpay();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState({
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    email: ""
  });

  const [welcomeOffer, setWelcomeOffer] = useState(null);
  const [checkoutBanner, setCheckoutBanner] = useState(null);
  const [gstSettings, setGstSettings] = useState(null);
  const [gstBreakdown, setGstBreakdown] = useState(null);
  const [indianStates, setIndianStates] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cartRes, userRes, welcomeRes, bannerRes, gstRes, statesRes] = await Promise.all([
        axios.get(`${API}/cart`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }).catch(() => null),
        axios.get(`${API}/user/first-time-buyer`, { withCredentials: true }).catch(() => null),
        axios.get(`${API}/banners?placement=checkout_page&status=active`).catch(() => ({ data: [] })),
        axios.get(`${API}/gst-settings`).catch(() => null),
        axios.get(`${API}/indian-states`).catch(() => ({ data: [] }))
      ]);

      setCart(cartRes.data);
      setUser(userRes?.data);
      
      // Set GST settings
      if (gstRes?.data) {
        setGstSettings(gstRes.data);
      }
      
      // Set Indian states
      if (statesRes?.data) {
        setIndianStates(statesRes.data);
      }
      
      // Check for first-time buyer welcome offer
      if (welcomeRes?.data?.is_first_time) {
        setWelcomeOffer(welcomeRes.data);
      }

      // Set checkout banner
      if (bannerRes.data && bannerRes.data.length > 0) {
        setCheckoutBanner(bannerRes.data[0]);
      }

      if (cartRes.data.items && cartRes.data.items.length > 0) {
        const productPromises = cartRes.data.items.map(item =>
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
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const subtotal = cart.items.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = Math.max(0, subtotal - discount);

  // Calculate GST breakdown when state changes
  const calculateGstBreakdown = useCallback(() => {
    if (!gstSettings || !gstSettings.gst_enabled) {
      setGstBreakdown(null);
      return;
    }

    const businessStateCode = gstSettings.business_state_code || "08";
    const customerState = indianStates.find(s => s.name === shippingAddress.state);
    const customerStateCode = customerState?.code || "";
    const isInterState = businessStateCode !== customerStateCode && customerStateCode !== "";

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    // Product-wise GST breakdown
    const productGstDetails = [];

    cart.items.forEach(item => {
      const product = products[item.product_id];
      if (!product) return;

      const gstRate = product.gst_rate || gstSettings.default_gst_rate || 18;
      const hsnCode = product.hsn_code || "-";
      const itemTotal = product.price * item.quantity;
      
      // If prices include GST (MRP style)
      let taxableAmount;
      if (gstSettings.prices_include_gst) {
        taxableAmount = itemTotal / (1 + gstRate / 100);
      } else {
        taxableAmount = itemTotal;
      }

      let itemCgst = 0, itemSgst = 0, itemIgst = 0;
      if (isInterState) {
        itemIgst = taxableAmount * gstRate / 100;
        totalIgst += itemIgst;
      } else {
        itemCgst = taxableAmount * (gstRate / 2) / 100;
        itemSgst = taxableAmount * (gstRate / 2) / 100;
        totalCgst += itemCgst;
        totalSgst += itemSgst;
      }
      totalTaxable += taxableAmount;

      // Add to product-wise breakdown
      productGstDetails.push({
        name: product.name,
        hsn: hsnCode,
        gstRate: gstRate,
        quantity: item.quantity,
        taxableAmount: taxableAmount.toFixed(2),
        cgst: itemCgst.toFixed(2),
        sgst: itemSgst.toFixed(2),
        igst: itemIgst.toFixed(2),
        totalTax: (itemCgst + itemSgst + itemIgst).toFixed(2)
      });
    });

    // Apply discount proportionally to taxable amount
    if (discount > 0) {
      const discountRatio = discount / subtotal;
      totalTaxable = totalTaxable * (1 - discountRatio);
      totalCgst = totalCgst * (1 - discountRatio);
      totalSgst = totalSgst * (1 - discountRatio);
      totalIgst = totalIgst * (1 - discountRatio);
    }

    setGstBreakdown({
      isInterState,
      taxableAmount: totalTaxable.toFixed(2),
      cgst: totalCgst.toFixed(2),
      sgst: totalSgst.toFixed(2),
      igst: totalIgst.toFixed(2),
      totalGst: (totalCgst + totalSgst + totalIgst).toFixed(2),
      productDetails: productGstDetails
    });
  }, [gstSettings, shippingAddress.state, indianStates, cart.items, products, discount, subtotal]);

  useEffect(() => {
    if (gstSettings && shippingAddress.state && subtotal > 0) {
      calculateGstBreakdown();
    }
  }, [shippingAddress.state, subtotal, discount, gstSettings, products, calculateGstBreakdown]);

  const handleApplyCoupon = async (codeToApply = null) => {
    const code = codeToApply || couponCode;
    if (!code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    try {
      const response = await axios.post(`${API}/coupons/validate`, {
        code: code.toUpperCase(),
        total_amount: subtotal
      });

      setAppliedCoupon({
        code: code.toUpperCase(),
        discount: response.data.discount,
        final_amount: response.data.final_amount
      });
      setCouponCode(code.toUpperCase());
      toast.success(`Coupon applied! You save ₹${response.data.discount.toFixed(2)}`);
      setWelcomeOffer(null); // Hide welcome banner after applying
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid coupon code");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!shippingAddress.full_name || !shippingAddress.phone || !shippingAddress.address_line1 || 
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        product_name: products[item.product_id]?.name || "",
        quantity: item.quantity,
        price: products[item.product_id]?.price || 0
      }));

      const orderData = {
        items: orderItems,
        total_amount: total,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        guest_email: !user ? shippingAddress.email : undefined,
        coupon_code: appliedCoupon?.code || null,
        discount_amount: discount
      };

      const orderResponse = await axios.post(`${API}/orders`, orderData, { withCredentials: true });
      const orderId = orderResponse.data.order_id;

      // All payment methods go through Razorpay with preferred method hint
      await handleRazorpayPayment(orderId, paymentMethod);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Checkout failed");
    }
  };

  const handleRazorpayPayment = async (orderId, preferredMethod = "razorpay") => {
    try {
      const response = await axios.post(`${API}/payments/razorpay/order?order_id=${orderId}`);
      const razorpayOrder = response.data;

      // Map payment method to Razorpay's preferred method
      const methodConfig = {
        razorpay: { method: "upi" },
        card: { method: "card" },
        netbanking: { method: "netbanking" }
      };

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_S7Iuxv3a5NUNK3",
        amount: razorpayOrder.amount,
        currency: "INR",
        order_id: razorpayOrder.id,
        name: "Paridhaan Creations",
        description: `Order #${orderId}`,
        image: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=100",
        handler: async (response) => {
          try {
            setPlacingOrder(true);
            const verifyRes = await axios.post(`${API}/payments/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            if (verifyRes.data.status === "success") {
              await axios.post(`${API}/cart/clear`, {}, { withCredentials: true });
              toast.success("🎉 Payment successful! Order placed.");
              navigate(`/order-success?order_id=${orderId}`);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed. Please contact support with Order ID: " + orderId);
          } finally {
            setPlacingOrder(false);
          }
        },
        prefill: {
          name: shippingAddress.full_name,
          contact: shippingAddress.phone,
          email: user?.email || shippingAddress.email || ""
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: "Pay using UPI",
                instruments: [
                  { method: "upi", flows: ["collect", "intent", "qr"] }
                ]
              },
              other: {
                name: "Other Methods",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" }
                ]
              }
            },
            sequence: preferredMethod === "razorpay" ? ["block.utib", "block.other"] : ["block.other", "block.utib"],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        theme: {
          color: "#0F4C75"
        },
        modal: {
          ondismiss: function() {
            toast.error("Payment cancelled");
          }
        }
      };

      const razorpayInstance = new Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      console.error("Razorpay error:", error);
      toast.error("Payment initialization failed");
    }
  };

  const handleStripePayment = async (orderId) => {
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(`${API}/payments/stripe/session?order_id=${orderId}&origin_url=${encodeURIComponent(originUrl)}`);
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Stripe error:", error);
      toast.error("Payment initialization failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    navigate("/cart");
    return null;
  }

  const steps = [
    { number: 1, title: "Shipping", icon: MapPin },
    { number: 2, title: "Payment", icon: CreditCard },
    { number: 3, title: "Review", icon: Check }
  ];

  return (
    <div className="min-h-screen py-12 bg-background-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12 text-center" data-testid="checkout-title">Secure Checkout</h1>

        {/* Checkout Page Banner */}
        {checkoutBanner && (
          <div className="mb-8" data-testid="checkout-banner">
            {checkoutBanner.link ? (
              <a 
                href={checkoutBanner.link}
                onClick={() => axios.post(`${API}/banners/${checkoutBanner.banner_id}/click`).catch(() => {})}
                className="block overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <img 
                  src={getImageUrl(checkoutBanner)} 
                  alt={checkoutBanner.title || 'Special offer'}
                  className="w-full h-40 md:h-52 object-cover"
                  loading="lazy"
                />
                {(checkoutBanner.title || checkoutBanner.cta_text) && (
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
                    {checkoutBanner.title && (
                      <p className="font-bold text-primary text-lg">{checkoutBanner.title}</p>
                    )}
                    {checkoutBanner.cta_text && (
                      <p className="text-sm text-muted-foreground">{checkoutBanner.cta_text}</p>
                    )}
                  </div>
                )}
              </a>
            ) : (
              <div className="overflow-hidden rounded-lg shadow-md">
                <img 
                  src={getImageUrl(checkoutBanner)} 
                  alt={checkoutBanner.title || 'Special offer'}
                  className="w-full h-40 md:h-52 object-cover"
                  loading="lazy"
                />
                {(checkoutBanner.title || checkoutBanner.cta_text) && (
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
                    {checkoutBanner.title && (
                      <p className="font-bold text-primary text-lg">{checkoutBanner.title}</p>
                    )}
                    {checkoutBanner.cta_text && (
                      <p className="text-sm text-muted-foreground">{checkoutBanner.cta_text}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Welcome Offer Banner for First-time Buyers */}
        {welcomeOffer && !appliedCoupon && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-lg" data-testid="welcome-offer-banner">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 text-white p-2 rounded-full">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-lg">🎉 First Order Special!</p>
                  <p className="text-green-700 text-sm">{welcomeOffer.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleApplyCoupon(welcomeOffer.welcome_coupon)}
                className="bg-green-600 text-white px-6 py-2 font-medium hover:bg-green-700 transition-all rounded-full flex items-center space-x-2"
                data-testid="apply-welcome-coupon-btn"
              >
                <span>Apply {welcomeOffer.welcome_coupon}</span>
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? 'bg-green-500 border-green-500' :
                      isActive ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-8 h-8 text-white" />
                      ) : (
                        <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <p className={`mt-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-24 h-1 ${currentStep > step.number ? 'bg-green-500' : 'bg-border'}`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              {currentStep >= 1 && (
                <div className="bg-white border border-border/40 overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center space-x-3">
                    <MapPin className="w-6 h-6" />
                    <h2 className="text-2xl font-heading font-bold">Delivery Address</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.full_name}
                          onChange={(e) => setShippingAddress({...shippingAddress, full_name: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter your full name"
                          data-testid="full-name-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="+91 XXXXXXXXXX"
                          data-testid="phone-input"
                        />
                      </div>

                      {!user && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={shippingAddress.email || ""}
                            onChange={(e) => setShippingAddress({...shippingAddress, email: e.target.value})}
                            className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="your.email@example.com"
                            data-testid="email-input"
                          />
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.address_line1}
                          onChange={(e) => setShippingAddress({...shippingAddress, address_line1: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="House No., Building Name"
                          data-testid="address1-input"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Address Line 2 (Optional)</label>
                        <input
                          type="text"
                          value={shippingAddress.address_line2}
                          onChange={(e) => setShippingAddress({...shippingAddress, address_line2: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Street Name, Area"
                          data-testid="address2-input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">City *</label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="City"
                          data-testid="city-input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">State *</label>
                        <select
                          required
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          data-testid="state-input"
                        >
                          <option value="">Select State</option>
                          {indianStates.map(state => (
                            <option key={state.code} value={state.name}>{state.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Pincode *</label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.pincode}
                          onChange={(e) => setShippingAddress({...shippingAddress, pincode: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="000000"
                          data-testid="pincode-input"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="mt-6 w-full bg-primary text-primary-foreground py-4 font-medium hover:bg-primary/90 transition-all"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {currentStep >= 2 && (
                <div className="bg-white border border-border/40 overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center space-x-3">
                    <CreditCard className="w-6 h-6" />
                    <h2 className="text-2xl font-heading font-bold">Payment Method</h2>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <label className="flex items-start space-x-4 p-4 border-2 border-border hover:border-primary cursor-pointer transition-all group">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={paymentMethod === "razorpay"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5 mt-1"
                        data-testid="razorpay-radio"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Smartphone className="w-5 h-5 text-primary" />
                          <span className="text-lg font-medium">UPI Payment</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1">Recommended</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Pay instantly using your favorite UPI app</p>
                        <div className="flex items-center space-x-3 flex-wrap gap-2">
                          <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium text-gray-700">Google Pay</span>
                          </div>
                          <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium text-gray-700">PhonePe</span>
                          </div>
                          <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium text-gray-700">Paytm</span>
                          </div>
                          <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium text-gray-700">BHIM</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1">Instant</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">Secure</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1">No OTP</span>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-4 p-4 border-2 border-border hover:border-primary cursor-pointer transition-all group">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5 mt-1"
                        data-testid="card-radio"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <span className="text-lg font-medium">Credit/Debit Card</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Visa, Mastercard, Rupay & more</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">All Cards</span>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-4 p-4 border-2 border-border hover:border-primary cursor-pointer transition-all group">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="netbanking"
                        checked={paymentMethod === "netbanking"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5 mt-1"
                        data-testid="netbanking-radio"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <span className="text-lg font-medium">Net Banking</span>
                        </div>
                        <p className="text-sm text-muted-foreground">All major banks supported</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1">50+ Banks</span>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowReviewModal(true)}
                      className="w-full bg-primary text-primary-foreground py-4 font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                      Review Order
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-border/40 sticky top-24">
                <div className="bg-secondary text-secondary-foreground px-6 py-4">
                  <h2 className="text-xl font-heading font-bold">Order Summary</h2>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.items.map((item) => {
                      const product = products[item.product_id];
                      if (!product) return null;

                      return (
                        <div key={item.product_id} className="flex items-center space-x-3 pb-3 border-b border-border">
                          <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover" />
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold">₹{(product.price * item.quantity).toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Coupon Code Section */}
                  <div className="pt-4 border-t border-border">
                    <label className="block text-sm font-medium mb-2">Have a coupon code?</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-green-600" />
                          <span className="font-mono font-bold text-green-700">{appliedCoupon.code}</span>
                          <span className="text-sm text-green-600">-₹{appliedCoupon.discount.toFixed(2)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-red-500 hover:text-red-700"
                          data-testid="remove-coupon-btn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
                          data-testid="coupon-input"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading}
                          className="px-4 py-2 bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-all disabled:opacity-50"
                          data-testid="apply-coupon-btn"
                        >
                          {couponLoading ? "..." : "Apply"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* GST Breakdown Section */}
                    {gstBreakdown && gstSettings?.gst_enabled && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
                          <span className="font-medium">GST Breakdown</span>
                          <span className="text-primary">(Included in price)</span>
                        </div>
                        
                        {/* Product-wise GST Details */}
                        {gstBreakdown.productDetails && gstBreakdown.productDetails.length > 0 && (
                          <div className="space-y-2 pb-2 border-b border-gray-200">
                            {gstBreakdown.productDetails.map((item, idx) => (
                              <div key={idx} className="text-xs bg-white p-2 rounded border border-gray-100">
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium text-gray-800 truncate flex-1 mr-2">{item.name}</span>
                                  <span className="text-orange-600 font-semibold whitespace-nowrap">{item.gstRate}% GST</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>HSN: {item.hsn} | Qty: {item.quantity}</span>
                                  <span>Tax: ₹{item.totalTax}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Taxable Amount</span>
                          <span>₹{gstBreakdown.taxableAmount}</span>
                        </div>
                        {gstBreakdown.isInterState ? (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>IGST</span>
                            <span>₹{gstBreakdown.igst}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>CGST</span>
                              <span>₹{gstBreakdown.cgst}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>SGST</span>
                              <span>₹{gstBreakdown.sgst}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-200">
                          <span>Total GST</span>
                          <span>₹{gstBreakdown.totalGst}</span>
                        </div>
                        {gstSettings?.gstin && (
                          <div className="text-xs text-center text-muted-foreground pt-1">
                            GSTIN: {gstSettings.gstin}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span className="text-green-600 font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                      <span>Total</span>
                      <span className="text-accent" data-testid="order-total">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {currentStep === 3 && (
                    <button
                      type="submit"
                      className="w-full bg-accent text-white py-4 font-bold tracking-wide hover:bg-accent/90 transition-all duration-300 flex items-center justify-center space-x-2"
                      data-testid="place-order-button"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>Place Order</span>
                    </button>
                  )}

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Free Shipping</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span>7 Days Return</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Review Order Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReviewModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-orange-500 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Review Your Order</h2>
                <p className="text-sm text-white/80">Please confirm all details before placing order</p>
              </div>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
              
              {/* Shipping Address */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <MapPin className="w-5 h-5 text-primary" />
                  Delivery Address
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{shippingAddress.full_name}</p>
                  <p>{shippingAddress.address_line1}</p>
                  {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                  <p>{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}</p>
                  <p className="text-primary">📱 {shippingAddress.phone}</p>
                  {shippingAddress.email && <p>✉️ {shippingAddress.email}</p>}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <Package className="w-5 h-5 text-primary" />
                  Order Items ({cart?.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {cart?.items?.map((item) => {
                    const product = products?.[item.product_id];
                    if (!product) return null;
                    return (
                      <div key={item.product_id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                        <img 
                          src={product.images?.[0] || 'https://placehold.co/80x80'} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          {product.gst_rate && (
                            <p className="text-xs text-orange-600">GST: {product.gst_rate}%</p>
                          )}
                        </div>
                        <p className="font-semibold text-primary">₹{(product.price * item.quantity).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-800">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Payment Method
                </h3>
                <p className="text-sm text-gray-600">
                  {paymentMethod === 'razorpay' && '📲 UPI (GPay, PhonePe, Paytm)'}
                  {paymentMethod === 'card' && '💳 Credit/Debit Card'}
                  {paymentMethod === 'netbanking' && '🏦 Net Banking'}
                  {paymentMethod === 'wallet' && '👛 Wallet'}
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                <h3 className="font-semibold mb-3 text-gray-800">Price Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{(subtotal || 0).toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {appliedCoupon && `(${appliedCoupon.code})`}</span>
                      <span>-₹{(discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                  
                  {/* GST Breakdown in Modal */}
                  {gstBreakdown && gstSettings?.gst_enabled && (
                    <div className="pt-2 mt-2 border-t border-orange-200 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Taxable Amount</span>
                        <span>₹{gstBreakdown.taxableAmount}</span>
                      </div>
                      {gstBreakdown.isInterState ? (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>IGST</span>
                          <span>₹{gstBreakdown.igst}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>CGST</span>
                            <span>₹{gstBreakdown.cgst}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>SGST</span>
                            <span>₹{gstBreakdown.sgst}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-3 mt-2 border-t border-orange-300 text-lg font-bold text-gray-900">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{(total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>Easy Returns</span>
                </div>
              </div>
            </div>

            {/* Footer with Place Order Button */}
            <div className="border-t bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setCurrentStep(3);
                  // Trigger place order
                  setTimeout(() => {
                    document.querySelector('[data-testid="place-order-button"]')?.click();
                  }, 100);
                }}
                disabled={placingOrder}
                className="w-full bg-gradient-to-r from-primary to-orange-500 text-white py-4 font-bold text-lg hover:from-primary/90 hover:to-orange-400 transition-all rounded-xl flex items-center justify-center gap-2 shadow-lg"
              >
                {placingOrder ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Place Order - ₹{(total || 0).toLocaleString()}</span>
                  </>
                )}
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                By placing this order, you agree to our Terms & Conditions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
