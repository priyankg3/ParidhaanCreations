/**
 * Optimize external image URLs for better performance
 * Supports Unsplash and Pexels image optimization
 */
export const optimizeImageUrl = (url, width = 400, height = 400) => {
  if (!url) return url;
  
  // Already optimized or local image
  if (url.includes('/api/') || url.includes('?w=') || url.includes('auto=compress')) {
    return url;
  }
  
  // Cloudinary optimization - serve HD quality with auto format
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary')) {
    // Add Cloudinary transformations for HD quality
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/q_auto:best,f_auto,w_${width},c_limit/`);
    }
    return url;
  }
  
  // Unsplash optimization
  if (url.includes('unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&h=${height}&fit=crop&q=80&fm=webp`;
  }
  
  // Pexels optimization
  if (url.includes('pexels.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
  }
  
  return url;
};

/**
 * Get optimized product image URL
 * Uses smaller dimensions for thumbnails/cards
 */
export const getOptimizedProductImage = (imageUrl, size = 'medium') => {
  const sizes = {
    small: { w: 300, h: 300 },
    medium: { w: 500, h: 500 },
    large: { w: 800, h: 800 }
  };
  const { w, h } = sizes[size] || sizes.medium;
  return optimizeImageUrl(imageUrl, w, h);
};

/**
 * Get optimized category image URL
 */
export const getOptimizedCategoryImage = (imageUrl) => {
  return optimizeImageUrl(imageUrl, 400, 400);
};

/**
 * Get optimized banner image URL
 */
export const getOptimizedBannerImage = (imageUrl, type = 'hero') => {
  const sizes = {
    hero: { w: 1200, h: 600 },
    category: { w: 1400, h: 300 },
    sidebar: { w: 300, h: 400 },
    popup: { w: 500, h: 500 }
  };
  const { w, h } = sizes[type] || sizes.hero;
  return optimizeImageUrl(imageUrl, w, h);
};
