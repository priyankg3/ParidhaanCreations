import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

/**
 * Handles the Google OAuth redirect: Google sends the user here with a
 * ?code=... query param, and we POST that code to the backend, which
 * exchanges it for tokens and sets the session cookie.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCode = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        toast.error(`Google login failed: ${error}`);
        navigate("/login");
        return;
      }
      if (!code) {
        toast.error("No authorization code received");
        navigate("/login");
        return;
      }

      try {
        const response = await axios.post(
          `${API}/auth/google/exchange`,
          { code },
          { withCredentials: true }
        );
        toast.success("Login successful!");
        navigate("/", { state: { user: response.data }, replace: true });
      } catch (err) {
        console.error("Auth exchange error:", err);
        toast.error(
          err?.response?.data?.detail || "Authentication failed"
        );
        navigate("/login");
      }
    };

    processCode();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Signing you in…</p>
      </div>
    </div>
  );
}
