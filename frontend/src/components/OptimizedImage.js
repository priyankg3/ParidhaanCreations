import React, { useState, useCallback } from 'react';

/**
 * OptimizedImage - A robust, reusable image component for Paridhaan Creations
 * 
 * This component ensures consistent image handling across the application:
 * - Always uses object-cover for proper image display
 * - Handles loading and error states gracefully
 * - Provides lazy loading for performance
 * - Prevents image display issues across forks
 * 
 * Usage:
 * <OptimizedImage 
 *   src={imageUrl} 
 *   alt="Product name" 
 *   className="w-full h-full"
 *   aspectRatio="square" // or "video", "banner", "portrait"
 * />
 */

const FALLBACK_IMAGES = {
  product: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&q=50&fm=webp',
  category: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&q=50&fm=webp',
  banner: 'https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=1200&h=600&fit=crop&q=60&fm=webp',
  default: 'https://placehold.co/400x400?text=Image+Not+Available'
};

const ASPECT_RATIOS = {
  square: 'aspect-square',
  video: 'aspect-video',
  banner: 'aspect-[3/1]',
  portrait: 'aspect-[3/4]',
  auto: ''
};

export default function OptimizedImage({
  src,
  alt,
  className = '',
  aspectRatio = 'auto',
  fallbackType = 'default',
  priority = false,
  onLoad,
  onError,
  showLoadingState = false,
  hoverEffect = false,
  dataTestId,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback((e) => {
    setIsLoading(false);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e) => {
    setIsLoading(false);
    setHasError(true);
    
    // Set fallback image
    const fallbackSrc = FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default;
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false); // Reset error state to try loading fallback
    }
    
    onError?.(e);
  }, [currentSrc, fallbackType, onError]);

  // Build class string - ALWAYS include object-cover for proper image display
  const imageClasses = [
    'object-cover', // CRITICAL: This ensures images display correctly
    hoverEffect && 'group-hover:scale-105 transition-transform duration-500',
    className
  ].filter(Boolean).join(' ');

  const aspectClass = ASPECT_RATIOS[aspectRatio] || '';

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${aspectClass}`}>
      {/* Loading skeleton */}
      {showLoadingState && isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      <img
        src={currentSrc || FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default}
        alt={alt}
        className={imageClasses}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'low'}
        data-testid={dataTestId}
        {...props}
      />
    </div>
  );
}

/**
 * ProductImage - Specialized image component for product cards and details
 */
export function ProductImage({ 
  src, 
  alt, 
  className = '', 
  size = 'medium',
  showBadge = false,
  badge = null,
  ...props 
}) {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-full h-full',
    large: 'w-full h-full'
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`${sizeClasses[size] || sizeClasses.medium} ${className}`}
      aspectRatio="square"
      fallbackType="product"
      hoverEffect
      {...props}
    />
  );
}

/**
 * CategoryImage - Specialized image component for category cards
 */
export function CategoryImage({ src, alt, className = '', ...props }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`w-full h-full ${className}`}
      aspectRatio="square"
      fallbackType="category"
      hoverEffect
      {...props}
    />
  );
}

/**
 * BannerImage - Specialized image component for hero/promotional banners
 */
export function BannerImage({ 
  src, 
  alt, 
  className = '', 
  priority = true,
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`w-full h-full ${className}`}
      aspectRatio="auto"
      fallbackType="banner"
      priority={priority}
      {...props}
    />
  );
}

/**
 * ThumbnailImage - Specialized image component for thumbnails
 */
export function ThumbnailImage({ 
  src, 
  alt, 
  isSelected = false,
  onClick,
  className = '',
  ...props 
}) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square overflow-hidden border-2 transition-all bg-white ${
        isSelected ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        className="w-full h-full"
        fallbackType="product"
        {...props}
      />
    </button>
  );
}
