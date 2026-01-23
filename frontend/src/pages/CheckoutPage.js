import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { useRazorpay, RazorpayOrderOptions } from "react-razorpay";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { error, isLoading, Razorpay } = useRazorpay();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(true);
  
  const [shippingAddress, setShippingAddress] = useState({
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: ""
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

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="checkout-title">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border border-border/40 p-6">
                <h2 className="text-2xl font-heading font-bold mb-6">Shipping Address</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.full_name}
                      onChange={(e) => setShippingAddress({...shippingAddress, full_name: e.target.value})}
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      data-testid="full-name-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      data-testid="phone-input"
                    />
                  </div>

                  {!user && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={shippingAddress.email || ""}
                        onChange={(e) => setShippingAddress({...shippingAddress, email: e.target.value})}
                        className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      data-testid="address1-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={shippingAddress.address_line2}
                      onChange={(e) => setShippingAddress({...shippingAddress, address_line2: e.target.value})}
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                      className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      data-testid="pincode-input"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <h2 className="text-2xl font-heading font-bold mb-6">Payment Method</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5"
                      data-testid="razorpay-radio"
                    />
                    <span className="text-lg">Razorpay (UPI, Cards, Wallets)</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={paymentMethod === "stripe"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5"
                      data-testid="stripe-radio"
                    />
                    <span className="text-lg">Stripe (Cards)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white border border-border/40 p-6 sticky top-24">
                <h2 className="text-2xl font-heading font-bold mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => {
                    const product = products[item.product_id];
                    if (!product) return null;

                    return (
                      <div key={item.product_id} className="flex justify-between">
                        <span className="text-sm">{product.name} x {item.quantity}</span>
                        <span className="text-sm font-medium">₹{(product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span className="text-accent" data-testid="order-total">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-4 font-medium tracking-wide hover:bg-primary/90 transition-all duration-300"
                  data-testid="place-order-button"
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
