import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { 
  Package, Clock, CheckCircle, XCircle, Truck, MapPin, 
  Calendar, CreditCard, ShoppingBag, ChevronRight, 
  RefreshCw, Star, Gift, AlertCircle, Eye
} from "lucide-react";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");

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

  const getStatusConfig = (status, paymentStatus) => {
    // First check payment status
    if (paymentStatus === "pending") {
      return {
        icon: AlertCircle,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        badgeColor: "bg-amber-100 text-amber-700",
        label: "Payment Pending"
      };
    }
    
    const configs = {
      pending: {
        icon: Clock,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        badgeColor: "bg-amber-100 text-amber-700",
        label: "Processing"
      },
      confirmed: {
        icon: CheckCircle,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        badgeColor: "bg-emerald-100 text-emerald-700",
        label: "Confirmed"
      },
      processing: {
        icon: RefreshCw,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        badgeColor: "bg-blue-100 text-blue-700",
        label: "Processing"
      },
      shipped: {
        icon: Truck,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
        badgeColor: "bg-indigo-100 text-indigo-700",
        label: "Shipped"
      },
      in_transit: {
        icon: Truck,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        badgeColor: "bg-purple-100 text-purple-700",
        label: "In Transit"
      },
      out_for_delivery: {
        icon: MapPin,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
        borderColor: "border-cyan-200",
        badgeColor: "bg-cyan-100 text-cyan-700",
        label: "Out for Delivery"
      },
      delivered: {
        icon: Gift,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        badgeColor: "bg-green-100 text-green-700",
        label: "Delivered"
      },
      cancelled: {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        badgeColor: "bg-red-100 text-red-700",
        label: "Cancelled"
      }
    };
    return configs[status] || configs.pending;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "confirmed", "processing", "shipped", "in_transit", "out_for_delivery"].includes(order.status);
    if (filter === "delivered") return order.status === "delivered";
    if (filter === "cancelled") return order.status === "cancelled";
    return true;
  });

  const stats = {
    total: orders.length,
    active: orders.filter(o => ["pending", "confirmed", "processing", "shipped", "in_transit", "out_for_delivery"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
    totalSpent: orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + (o.total_amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-orange-200 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-orange-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center animate-bounce">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3" data-testid="no-orders-title">No orders yet</h2>
          <p className="text-gray-500 mb-8 text-lg">Your shopping journey begins here! Discover our beautiful collection of handicrafts and traditional items.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            data-testid="shop-now-link"
          >
            <ShoppingBag className="w-5 h-5" />
            Start Shopping
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" data-testid="orders-title">
            My Orders
          </h1>
          <p className="text-gray-500 mt-2">Track and manage your orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.delivered}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">₹{stats.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Spent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "all", label: "All Orders", count: orders.length },
            { key: "active", label: "Active", count: stats.active },
            { key: "delivered", label: "Delivered", count: stats.delivered },
            { key: "cancelled", label: "Cancelled", count: orders.filter(o => o.status === "cancelled").length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-orange-50 border border-gray-200"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status, order.payment_status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div
                key={order.order_id}
                className={`bg-white rounded-2xl shadow-sm border ${statusConfig.borderColor} overflow-hidden hover:shadow-lg transition-all duration-300`}
                data-testid={`order-${order.order_id}`}
              >
                {/* Order Header */}
                <div className={`${statusConfig.bgColor} px-6 py-4 border-b ${statusConfig.borderColor}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.badgeColor}`}>
                            {statusConfig.label}
                          </span>
                          {order.payment_status === "paid" && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              Paid ✓
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 font-mono" data-testid={`order-id-${order.order_id}`}>
                          #{order.order_id.slice(-12).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent" data-testid={`order-total-${order.order_id}`}>
                          ₹{(order.total_amount || 0).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 text-gray-500 text-sm justify-end">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.created_at).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-6">
                  {/* Items Preview */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx} 
                          className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden"
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-orange-400" />
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {order.items[0]?.product_name}
                        {order.items.length > 1 && <span className="text-gray-500"> & {order.items.length - 1} more</span>}
                      </p>
                      <p className="text-sm text-gray-500">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {selectedOrder === order.order_id && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                              <Package className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{item.product_name}</p>
                              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-800">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSelectedOrder(selectedOrder === order.order_id ? null : order.order_id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium text-sm transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      {selectedOrder === order.order_id ? "Hide Details" : "View Details"}
                    </button>
                    
                    {['confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery'].includes(order.status) && (
                      <Link
                        to={`/track/${order.order_id}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl text-white font-medium text-sm transition-all shadow-sm"
                        data-testid={`track-order-${order.order_id}`}
                      >
                        <Truck className="w-4 h-4" />
                        Track Order
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                    
                    {order.status === 'delivered' && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-medium text-sm">
                        <Gift className="w-4 h-4" />
                        Delivered Successfully!
                      </div>
                    )}

                    {order.payment_status === "pending" && (
                      <span className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-medium text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Awaiting Payment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Filtered State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No orders found in this category</p>
            <button
              onClick={() => setFilter("all")}
              className="mt-4 text-orange-600 font-medium hover:underline"
            >
              View all orders
            </button>
          </div>
        )}

        {/* Continue Shopping CTA */}
        <div className="mt-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 md:p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Want to explore more?</h3>
          <p className="text-orange-100 mb-6">Discover our beautiful collection of handicrafts and traditional items</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-orange-50 transition-all shadow-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            Continue Shopping
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
