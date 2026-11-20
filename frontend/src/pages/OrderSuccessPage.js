import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { CheckCircle, Package, MessageCircle } from "lucide-react";
import { getOrderWhatsAppLink } from "@/components/WhatsAppButton";

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else if (orderId) {
      fetchOrder();
    }
  }, [sessionId, orderId]);

  const pollPaymentStatus = async () => {
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/payments/stripe/status/${sessionId}`);
        if (response.data.payment_status === "paid") {
          const orderResponse = await axios.get(`${API}/orders/${response.data.metadata.order_id}`, { withCredentials: true });
          setOrder(orderResponse.data);
          setLoading(false);
        } else {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        attempts++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`, { withCredentials: true });
      setOrder(response.data);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-lg">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-6" />
          <h1 className="text-5xl font-heading font-bold mb-4" data-testid="success-title">Order Successful!</h1>
          <p className="text-lg text-muted-foreground">Thank you for your purchase</p>
        </div>

        {order && (
          <div className="bg-white border border-border/40 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-heading font-bold mb-4">Order Details</h2>
              <div className="space-y-2">
                <p className="text-lg">
                  <span className="font-medium">Order ID:</span> <span data-testid="order-id">{order.order_id}</span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Total Amount:</span> <span className="text-accent font-bold" data-testid="order-amount">₹{order.total_amount}</span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Payment Status:</span> <span className="text-green-600" data-testid="payment-status">{order.payment_status}</span>
                </p>
              </div>
            </div>

            {/* WhatsApp Support Card */}
            <div className="mb-8 bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 p-2 rounded-full">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-800">Need help with your order?</p>
                  <p className="text-sm text-green-600">Chat with us on WhatsApp for quick assistance</p>
                </div>
                <a
                  href={getOrderWhatsAppLink(order.order_id, order.total_amount)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-all text-sm font-medium"
                  data-testid="whatsapp-order-help"
                >
                  Chat Now
                </a>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-heading font-bold mb-4">Shipping Address</h2>
              <div className="text-muted-foreground">
                <p>{order.shipping_address.full_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</p>
                <p>{order.shipping_address.phone}</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-heading font-bold mb-4">Items Ordered</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-border pb-4">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/my-orders"
                className="flex-1 bg-primary text-primary-foreground py-3 px-6 text-center font-medium hover:bg-primary/90 transition-all"
                data-testid="view-orders-link"
              >
                View My Orders
              </Link>
              <Link
                to="/products"
                className="flex-1 bg-secondary text-secondary-foreground py-3 px-6 text-center font-medium hover:bg-secondary/90 transition-all"
                data-testid="continue-shopping-link"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
