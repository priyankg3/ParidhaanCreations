import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  ExternalLink,
  Copy,
  Box,
  Navigation
} from "lucide-react";
import SEO from "../components/SEO";
import { toast } from "sonner";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "processing", label: "Processing", icon: Box },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "in_transit", label: "In Transit", icon: Navigation },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 }
];

const getStatusIndex = (status) => {
  const index = STATUS_STEPS.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

export default function TrackingPage() {
  const { orderId } = useParams();
  const [tracking, setTracking] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const [trackingRes, orderRes] = await Promise.all([
        axios.get(`${API}/shiprocket/track/${orderId}`),
        axios.get(`${API}/orders/${orderId}`, { withCredentials: true }).catch(() => null)
      ]);
      
      setTracking(trackingRes.data);
      setOrder(orderRes?.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to fetch tracking information");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const currentStatusIndex = tracking ? getStatusIndex(tracking.status) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tracking Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link to="/" className="bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-colors">
          Go to Homepage
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`Track Order ${orderId} | Paridhaan Creations`}
        description="Track your order shipment status"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <Link to="/profile" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          {/* Header Card */}
          <div className="bg-white border border-border rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Track Your Order</h1>
                <p className="text-muted-foreground">Order ID: {orderId}</p>
              </div>
              
              {tracking?.awb_number && (
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 px-4 py-2 rounded-lg">
                    <p className="text-xs text-muted-foreground">AWB Number</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{tracking.awb_number}</span>
                      <button 
                        onClick={() => copyToClipboard(tracking.awb_number)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {tracking.tracking_url && (
                    <a 
                      href={tracking.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Track on Shiprocket
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Courier Info */}
            {tracking?.courier_name && (
              <div className="mt-4 pt-4 border-t flex items-center gap-4">
                <Truck className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Shipped via</p>
                  <p className="font-semibold">{tracking.courier_name}</p>
                </div>
                {tracking.estimated_delivery && (
                  <div className="ml-auto">
                    <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                    <p className="font-semibold text-green-600">{tracking.estimated_delivery}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Progress */}
          <div className="bg-white border border-border rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-6">Shipment Status</h2>
            
            {/* Progress Steps */}
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                          isCompleted 
                            ? isCurrent 
                              ? 'bg-primary text-white ring-4 ring-primary/20' 
                              : 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`mt-2 text-xs font-medium text-center ${
                        isCompleted ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="mt-8 text-center">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                tracking?.status === 'delivered' 
                  ? 'bg-green-100 text-green-700'
                  : tracking?.status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-primary/10 text-primary'
              }`}>
                <Clock className="w-4 h-4" />
                {tracking?.status?.replace(/_/g, ' ').toUpperCase() || 'PROCESSING'}
              </span>
            </div>
          </div>

          {/* Tracking History */}
          {tracking?.tracking_history && tracking.tracking_history.length > 0 && (
            <div className="bg-white border border-border rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Tracking History</h2>
              
              <div className="space-y-4">
                {[...tracking.tracking_history].reverse().map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${
                        index === 0 ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                      {index !== tracking.tracking_history.length - 1 && (
                        <div className="absolute top-4 left-1 w-0.5 h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">{event.status}</p>
                      {event.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Tracking Activities (from Shiprocket) */}
          {tracking?.live_tracking?.activities && tracking.live_tracking.activities.length > 0 && (
            <div className="bg-white border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Live Updates from Courier</h2>
              
              <div className="space-y-3">
                {tracking.live_tracking.activities.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{activity.activity}</p>
                      <p className="text-xs text-muted-foreground">{activity.location}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Tracking Yet */}
          {!tracking?.awb_number && tracking?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <Package className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-yellow-800 mb-2">Shipment Being Prepared</h3>
              <p className="text-yellow-700 text-sm">
                Your order is being prepared for shipping. Tracking details will be available once the package is dispatched.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
