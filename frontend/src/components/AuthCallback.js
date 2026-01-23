import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error("No session ID found");
        navigate("/login");
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

        toast.success("Login successful!");
        navigate("/", { state: { user: response.data }, replace: true });
      } catch (error) {
        console.error("Auth error:", error);
        toast.error("Authentication failed");
        navigate("/login");
      }
    };

    processSession();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Authenticating...</p>
      </div>
    </div>
  );
}