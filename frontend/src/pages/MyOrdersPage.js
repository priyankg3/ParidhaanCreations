import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Package, Clock, CheckCircle, XCircle, Truck, MapPin } from "lucide-react";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, { withCredentials: true });
      setOrders(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "shipped":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "text-green-600";
      case "shipped":
        return "text-blue-600";
      case "delivered":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
          <h2 className="text-3xl font-heading font-bold mb-4" data-testid="no-orders-title">No orders yet</h2>
          <p className="text-muted-foreground mb-8">Start shopping to place your first order</p>
          <Link
            to="/products"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all"
            data-testid="shop-now-link"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="orders-title">My Orders</h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.order_id}
              className="bg-white border border-border/40 p-6 hover:shadow-lg transition-all"
              data-testid={`order-${order.order_id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                  <p className="text-lg font-medium" data-testid={`order-id-${order.order_id}`}>{order.order_id}</p>
                </div>
                <div className="flex items-center space-x-2 mt-2 md:mt-0">
                  {getStatusIcon(order.status)}
                  <span className={`text-lg font-medium ${getStatusColor(order.status)}`} data-testid={`order-status-${order.order_id}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                  <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-xl font-bold text-accent" data-testid={`order-total-${order.order_id}`}>₹{order.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                  <p className="font-medium capitalize">{order.payment_status}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">Items ({order.items.length})</p>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
