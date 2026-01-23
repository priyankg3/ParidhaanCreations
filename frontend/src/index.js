import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import ErrorBoundary from "@/components/ErrorBoundary";

// Suppress browser extension errors (MetaMask, TronLink, etc.)
window.addEventListener('error', (event) => {
  // Suppress errors from browser extensions
  if (
    event.message?.includes('MetaMask') ||
    event.message?.includes('tronlink') ||
    event.message?.includes('extension') ||
    event.filename?.includes('chrome-extension') ||
    event.filename?.includes('moz-extension')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('MetaMask') ||
    event.reason?.message?.includes('tronlink') ||
    event.reason?.stack?.includes('chrome-extension') ||
    event.reason?.stack?.includes('moz-extension')
  ) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
