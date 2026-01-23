import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { useRazorpay } from "react-razorpay";
import { Check, CreditCard, Smartphone, MapPin, Package, ShieldCheck, Truck } from "lucide-react";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { error, isLoading, Razorpay } = useRazorpay();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cartRes, userRes] = await Promise.all([
        axios.get(`${API}/cart`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }).catch(() => null)
      ]);

      setCart(cartRes.data);
      setUser(userRes?.data);

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

  const total = cart.items.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

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
        guest_email: !user ? shippingAddress.email : undefined
      };

      const orderResponse = await axios.post(`${API}/orders`, orderData, { withCredentials: true });
      const orderId = orderResponse.data.order_id;

      if (paymentMethod === "razorpay") {
        await handleRazorpayPayment(orderId);
      } else {
        await handleStripePayment(orderId);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Checkout failed");
    }
  };

  const handleRazorpayPayment = async (orderId) => {
    try {
      const response = await axios.post(`${API}/payments/razorpay/order?order_id=${orderId}`);
      const razorpayOrder = response.data;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_S7Iuxv3a5NUNK3",
        amount: razorpayOrder.amount,
        currency: "INR",
        order_id: razorpayOrder.id,
        name: "Paridhaan Creations",
        description: `Order #${orderId}`,
        handler: async (response) => {
          try {
            await axios.post(`${API}/payments/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            await axios.post(`${API}/cart/clear`, {}, { withCredentials: true });
            toast.success("Payment successful!");
            navigate(`/order-success?order_id=${orderId}`);
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: shippingAddress.full_name,
          contact: shippingAddress.phone,
          email: user?.email || shippingAddress.email || ""
        },
        theme: {
          color: "#0F4C75"
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
                        <input
                          type="text"
                          required
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="State"
                          data-testid="state-input"
                        />
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
                          <span className="text-lg font-medium">Razorpay</span>
                        </div>
                        <p className="text-sm text-muted-foreground">UPI, Cards, Wallets, Net Banking</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1">Instant</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">Secure</span>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-4 p-4 border-2 border-border hover:border-primary cursor-pointer transition-all group">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="stripe"
                        checked={paymentMethod === "stripe"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5 mt-1"
                        data-testid="stripe-radio"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <span className="text-lg font-medium">Stripe</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Credit/Debit Cards (International)</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1">Global</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">Secure</span>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="w-full bg-primary text-primary-foreground py-4 font-medium hover:bg-primary/90 transition-all"
                    >
                      Review Order
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

                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
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
    </div>
  );
}
