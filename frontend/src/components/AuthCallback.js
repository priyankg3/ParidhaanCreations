import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error("No session ID found");
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await axios.post(
          `${API}/auth/session`,
          {},
          {
            headers: { "X-Session-ID": sessionId },
            withCredentials: true
          }
        );

        // Clear the hash from URL before navigating
        window.history.replaceState(null, '', window.location.pathname);
        
        toast.success("Login successful!");
        
        // Small delay to ensure state is properly set
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 100);
      } catch (error) {
        console.error("Auth error:", error);
        setError("Authentication failed. Please try again.");
        toast.error("Authentication failed");
        
        // Clear hash and navigate to login
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1500);
      }
    };

    processSession();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
        <div className="relative mx-auto w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-gray-700">Authenticating...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we verify your login</p>
      </div>
    </div>
  );
}