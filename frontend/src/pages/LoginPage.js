import React, { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import SEO from "@/components/SEO";
import { GoogleLogin } from "@react-oauth/google";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login, register, forgot
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle Google OAuth Success
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/google`, {
        credential: credentialResponse.credential
      }, { withCredentials: true });
      
      toast.success("Login successful!");
      window.location.href = "/";
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error.response?.data?.detail || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Error
  const handleGoogleError = () => {
    toast.error("Google Sign-In failed. Please try again or use email/password.");
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: formData.email,
        password: formData.password
      }, { withCredentials: true });
      
      toast.success("Login successful!");
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || null
      }, { withCredentials: true });
      
      toast.success("Registration successful! Welcome to Paridhaan Creations!");
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error("Please enter your email");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, {
        email: formData.email
      });
      
      toast.success("If this email exists, you will receive password reset instructions.");
      setMode("login");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <SEO title="Login / Register" noindex={true} />
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <img 
            src="/logo-header.png" 
            alt="Paridhaan Creations" 
            className="mx-auto h-20 w-auto mb-6"
          />
          <h2 className="text-3xl font-heading font-bold mb-1 text-gray-800" data-testid="login-title">
            {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Reset Password"}
          </h2>
          <p className="text-gray-500 text-sm">
            {mode === "login" 
              ? "Sign in to your account" 
              : mode === "register" 
                ? "Join our spiritual community" 
                : "Enter your email to reset password"}
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-orange-100">
          {/* Google Login Button - Always visible for login/register */}
          {mode !== "forgot" && (
            <>
              <div className="flex justify-center" data-testid="google-login-button">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text={mode === "login" ? "signin_with" : "signup_with"}
                  shape="rectangular"
                  width="100%"
                />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    data-testid="email-input"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="login-submit"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          {/* Toggle between modes */}
          <div className="mt-6 text-center text-sm">
            {mode === "login" && (
              <p className="text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-orange-600 font-medium hover:text-orange-700"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === "register" && (
              <p className="text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-orange-600 font-medium hover:text-orange-700"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => setMode("login")}
                className="text-orange-600 font-medium hover:text-orange-700"
              >
                ← Back to login
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
