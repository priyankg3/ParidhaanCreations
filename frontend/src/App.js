import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "@/App.css";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Configure axios to always send credentials (cookies)
axios.defaults.withCredentials = true;

// Essential components loaded immediately
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DynamicFavicon from "@/components/DynamicFavicon";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";

// Lazy load all page components for code splitting
const HomePage = lazy(() => import("@/pages/HomePage"));
const ProductListingPage = lazy(() => import("@/pages/ProductListingPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("@/pages/OrderSuccessPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const MyOrdersPage = lazy(() => import("@/pages/MyOrdersPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const TrackingPage = lazy(() => import("@/pages/TrackingPage"));

// Lazy load non-critical components
const AuthCallback = lazy(() => import("@/components/AuthCallback"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));
const WhatsAppButton = lazy(() => import("@/components/WhatsAppButton"));

// Backend URL is always read from REACT_APP_BACKEND_URL. In the Emergent
// deployment the frontend and backend shared an origin, so a fallback to
// window.location.origin existed. On Vercel/Railway they live on different
// hosts (e.g. paridhaancreations.xyz + api.paridhaancreations.xyz), so the
// env var must be set at build time.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
export const API = `${BACKEND_URL}/api`;

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// Minimal loader for small components
const SmallLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AppRouter() {
  const location = useLocation();

  // Hide WhatsApp button on admin pages and during the OAuth handoff
  const showWhatsApp = !location.pathname.startsWith('/admin') &&
                        location.pathname !== '/auth/google';

  return (
    <div className="App">
      <DynamicFavicon />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListingPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google" element={<AuthCallback />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/wishlist" element={
            <Suspense fallback={<SmallLoader />}>
              <ProtectedRoute><WishlistPage /></ProtectedRoute>
            </Suspense>
          } />
          <Route path="/my-orders" element={
            <Suspense fallback={<SmallLoader />}>
              <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
            </Suspense>
          } />
          <Route path="/track/:orderId" element={<TrackingPage />} />
          <Route path="/admin" element={
            <Suspense fallback={<SmallLoader />}>
              <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
            </Suspense>
          } />
        </Routes>
      </Suspense>
      <Footer />
      {showWhatsApp && (
        <Suspense fallback={null}>
          <WhatsAppButton />
        </Suspense>
      )}
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <SiteSettingsProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </SiteSettingsProvider>
    </LanguageProvider>
  );
}

export default App;
