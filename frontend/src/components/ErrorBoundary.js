import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if error is from browser extension
    const errorString = error?.toString() || '';
    const stackString = error?.stack || '';
    
    if (
      errorString.includes('MetaMask') ||
      errorString.includes('tronlink') ||
      errorString.includes('extension') ||
      stackString.includes('chrome-extension') ||
      stackString.includes('moz-extension')
    ) {
      // Don't show error for browser extensions
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Check if error is from browser extension
    const errorString = error?.toString() || '';
    const stackString = error?.stack || '';
    
    if (
      errorString.includes('MetaMask') ||
      errorString.includes('tronlink') ||
      errorString.includes('extension') ||
      stackString.includes('chrome-extension') ||
      stackString.includes('moz-extension')
    ) {
      // Silently ignore browser extension errors
      return;
    }

    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-paper">
          <div className="max-w-md w-full bg-white border border-border p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-heading font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
