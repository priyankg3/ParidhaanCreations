import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
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

// Hydration-aware mount: react-snap writes a pre-rendered HTML tree into
// #root at build time. When the browser loads that HTML we want to attach
// to the existing DOM (hydrateRoot) instead of wiping it and re-rendering
// (createRoot) — otherwise the first-paint HTML flickers out before React
// mounts and we lose the SEO/perf benefit of pre-rendering.
const rootElement = document.getElementById("root");
const tree = (
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, tree);
} else {
  createRoot(rootElement).render(tree);
}
