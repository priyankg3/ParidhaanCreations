import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
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

    // Check if this is a navigation/auth related error that can be auto-recovered
    if (
      errorString.includes('Cannot read properties of undefined') ||
      errorString.includes('Cannot read properties of null') ||
      errorString.includes('useNavigate') ||
      errorString.includes('useLocation')
    ) {
      // Try to auto-recover by clearing hash and reloading (max 1 attempt)
      const recoveryAttempted = sessionStorage.getItem('errorRecoveryAttempted');
      if (window.location.hash && !recoveryAttempted) {
        sessionStorage.setItem('errorRecoveryAttempted', 'true');
        window.history.replaceState(null, '', window.location.pathname);
        window.location.reload();
        return { hasError: false };
      }
      // Clear the recovery flag if no hash
      sessionStorage.removeItem('errorRecoveryAttempted');
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
    this.setState({ errorInfo });
  }

  handleRefresh = () => {
    // Clear any hash fragments and recovery flag before refreshing
    sessionStorage.removeItem('errorRecoveryAttempted');
    window.history.replaceState(null, '', window.location.pathname);
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem('errorRecoveryAttempted');
    window.history.replaceState(null, '', '/');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 font-medium hover:from-orange-600 hover:to-amber-600 transition-all rounded-xl shadow-md"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="bg-gray-100 text-gray-700 px-6 py-3 font-medium hover:bg-gray-200 transition-all rounded-xl"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
