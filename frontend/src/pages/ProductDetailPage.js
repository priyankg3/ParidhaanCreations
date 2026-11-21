import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ShoppingCart, Heart, Minus, Plus, Star, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductBadge from "@/components/ProductBadge";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);  // NEW: Size selection
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [productBanner, setProductBanner] = useState(null);
  const [relatedSlide, setRelatedSlide] = useState(0);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      // Auto-select first variant if available
      if (response.data?.variants?.length > 0) {
        setSelectedVariant(0);
        setSelectedImage(0);
        // Auto-select first size if variant has sizes
        if (response.data.variants[0]?.sizes?.length > 0) {
          setSelectedSize(0);
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Product not found");
      navigate("/products");
    }
  }, [id, navigate]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reviews/${id}`);
      // Handle both old format (array) and new format ({reviews: []})
      const reviewsData = response.data?.reviews || response.data || [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]); // Ensure reviews is always an array
    }
  }, [id]);

  const fetchRelatedProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/products/${id}/related?limit=8`);
      setRelatedProducts(response.data);
      setRelatedSlide(0); // Reset slider position
    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  }, [id]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  }, []);

  const fetchProductBanner = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/banners?placement=product_page&status=active`);
      if (response.data && response.data.length > 0) {
        setProductBanner(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching product banner:", error);
    }
  }, []);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    checkAuth();
    fetchRelatedProducts();
    fetchProductBanner();
  }, [fetchProduct, fetchReviews, checkAuth, fetchRelatedProducts, fetchProductBanner]);

  const getImageUrl = (banner) => {
    if (!banner) return '';
    let url = banner.image_desktop || banner.image || '';
    if (url && url.startsWith('/api/')) {
      url = `${API}${url.replace('/api', '')}`;
    }
    return url;
  };

  // Variant helpers - Color × Size matrix
  const hasVariants = product?.variants?.length > 0;
  const activeVariant = hasVariants && selectedVariant !== null ? product.variants[selectedVariant] : null;
  const hasSizes = activeVariant?.sizes?.length > 0;
  const activeSize = hasSizes && selectedSize !== null ? activeVariant.sizes[selectedSize] : null;
  
  // Display values depend on: Size (if selected) → Variant (if selected) → Product base
  const displayImages = activeVariant?.images?.length > 0 ? activeVariant.images : (product?.images || []);
  const displayPrice = activeSize?.price || activeVariant?.price || product?.price;
  const displayMrp = activeSize?.mrp || activeVariant?.mrp || product?.mrp;
  const displayStock = activeSize ? activeSize.stock : (activeVariant?.stock ?? product?.stock);
  
  // Calculate discount percentage
  const discountPercentage = displayMrp && displayPrice && displayMrp > displayPrice
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  const handleVariantSelect = (index) => {
    setSelectedVariant(index);
    setSelectedImage(0);
    // Reset size selection when color changes
    const variant = product.variants[index];
    if (variant?.sizes?.length > 0) {
      setSelectedSize(0);  // Auto-select first size
    } else {
      setSelectedSize(null);
    }
  };

  const handleSizeSelect = (sizeIndex) => {
    setSelectedSize(sizeIndex);
  };

  const addToCart = async () => {
    // Validate size selection if sizes exist
    if (hasSizes && selectedSize === null) {
      toast.error("Please select a size");
      return;
    }
    
    try {
      const cartData = { product_id: id, quantity };
      if (activeVariant) {
        cartData.selected_color = activeVariant.color_name;
      }
      if (activeSize) {
        cartData.selected_size = activeSize.size;
      }
      await axios.post(`${API}/cart/add`, cartData, { withCredentials: true });
      const label = [activeVariant?.color_name, activeSize?.size].filter(Boolean).join(' - ');
      toast.success(label ? `${label} added to cart!` : "Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const addToWishlist = async () => {
    try {
      await axios.post(`${API}/wishlist/add/${id}`, {}, { withCredentials: true });
      toast.success("Added to wishlist!");
    } catch (error) {
      toast.error("Please login to add to wishlist");
    }
  };

  const buyNow = async () => {
    await addToCart();
    navigate("/cart");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }

    try {
      await axios.post(`${API}/reviews`, {
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      }, { withCredentials: true });
      
      toast.success("Review submitted successfully!");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: "" });
      fetchReviews();
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit review");
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-5 h-5 ${index < rating ? "fill-secondary text-secondary" : "text-gray-300"}`}
      />
    ));
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen py-12">
      {product && (
        <SEO 
          title={`${product.name} - Buy Online at Paridhaan Creations`}
          description={`${product.description?.slice(0, 150) || product.name}. Price: ₹${product.price}. ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}. Free shipping on orders above ₹999.`}
          keywords={`${product.name}, ${product.category}, buy online, paridhaan creations, ${product.material || ''}, ${product.brand || ''}, ${(product.tags || []).join(', ')}`}
          image={product.images?.[0]}
          type="product"
          product={{
            ...product,
            rating: avgRating,
            reviewCount: reviews.length
          }}
          breadcrumbs={[
            { name: 'Home', url: '/' },
            { name: 'Products', url: '/products' },
            { name: product.category, url: `/products?category=${product.category}` },
            { name: product.name, url: `/products/${product.product_id}` }
          ]}
        />
      )}
      <div className="max-w-7xl mx-auto">
        {product && (
          <Breadcrumbs items={[
            { name: 'Products', url: '/products' },
            { name: product.category, url: `/products?category=${product.category}` },
            { name: product.name, url: `/products/${product.product_id}` }
          ]} />
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Product Page Banner */}
        {productBanner && (
          {/* Product page banner — 4:1 aspect matches 800x200 recommended.
              Narrow by design so it doesn't push product info below the fold.
              Mobile 3:1 fallback for readability. */}
          <div className="mb-8" data-testid="product-page-banner">
            {productBanner.link ? (
              <a
                href={productBanner.link}
                onClick={() => axios.post(`${API}/banners/${productBanner.banner_id}/click`).catch(() => {})}
                className="block overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow aspect-[3/1] md:aspect-[4/1]"
              >
                <img
                  src={getImageUrl(productBanner)}
                  alt={productBanner.title || 'Special offer'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ) : (
              <div className="overflow-hidden rounded-lg shadow-sm aspect-[3/1] md:aspect-[4/1]">
                <img
                  src={getImageUrl(productBanner)}
                  alt={productBanner.title || 'Special offer'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square mb-4 overflow-hidden bg-white border border-border/40 relative">
              <ProductBadge type={displayStock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
              <img
                src={displayImages?.[selectedImage] || 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                data-testid="product-main-image"
                style={{ backgroundColor: 'transparent' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Image+Not+Available';
                }}
              />
            </div>
            {displayImages && displayImages.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {displayImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden border-2 transition-all bg-white ${
                      selectedImage === index ? "border-primary" : "border-border/40"
                    }`}
                    data-testid={`product-thumb-${index}`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} ${index + 1}`} 
                      className="w-full h-full object-contain p-1"
                      style={{ backgroundColor: 'transparent' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/150x150/f3f4f6/9ca3af?text=No+Image';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Category Badge */}
            <div>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase rounded-full">
                {product.category}
              </span>
            </div>
            
            {/* Product Title - E-commerce style */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 leading-tight" data-testid="product-name">
              {product.name}
            </h1>
            
            {/* Rating (if reviews exist) */}
            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(Math.round(parseFloat(avgRating)))}</div>
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}
            
            {/* Price Section - E-commerce style */}
            <div className="py-4 border-y border-gray-200">
              <div className="flex items-baseline flex-wrap gap-3" data-testid="product-price">
                <span className="text-3xl md:text-4xl font-bold text-gray-900">₹{displayPrice?.toLocaleString('en-IN')}</span>
                {displayMrp && displayMrp > displayPrice && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{displayMrp?.toLocaleString('en-IN')}</span>
                    <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-md">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-green-600 mt-2 font-medium">Inclusive of all taxes</p>
            </div>

            {/* Color Variants Swatches */}
            {hasVariants && (
              <div data-testid="color-variants-section">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Color: <span className="text-primary">{activeVariant?.color_name || 'Select'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVariantSelect(idx)}
                      className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        selectedVariant === idx
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      data-testid={`color-variant-${idx}`}
                      title={variant.color_name}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border ${selectedVariant === idx ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300'}`}
                        style={{ backgroundColor: variant.color_code || '#ccc' }}
                      />
                      <span className={`text-sm ${selectedVariant === idx ? 'text-primary font-medium' : 'text-gray-600'}`}>
                        {variant.color_name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Options - Shows when variant has sizes */}
            {hasSizes && (
              <div data-testid="size-variants-section">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Size: <span className="text-primary">{activeSize?.size || 'Select Size'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeVariant.sizes.map((sizeOpt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSizeSelect(idx)}
                      disabled={sizeOpt.stock === 0}
                      className={`relative px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        selectedSize === idx
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : sizeOpt.stock === 0
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                            : 'border-gray-200 hover:border-gray-400'
                      }`}
                      data-testid={`size-variant-${idx}`}
                    >
                      <span className={`text-sm font-medium ${selectedSize === idx ? 'text-primary' : ''}`}>
                        {sizeOpt.size}
                      </span>
                      {sizeOpt.price && (
                        <span className={`block text-xs ${selectedSize === idx ? 'text-primary/80' : 'text-gray-500'}`}>
                          ₹{sizeOpt.price}
                        </span>
                      )}
                      {sizeOpt.stock === 0 && (
                        <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">
                          Out
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="flex items-center gap-2">
              {displayStock > 0 ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm font-medium text-green-600" data-testid="product-stock">In Stock ({displayStock} available)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-sm font-medium text-red-600" data-testid="product-stock">Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Quantity</p>
              <div className="flex items-center">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-lg hover:bg-gray-100 transition-colors"
                  data-testid="decrease-quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-14 h-10 flex items-center justify-center border-y border-gray-300 font-semibold text-lg" data-testid="quantity-display">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-r-lg hover:bg-gray-100 transition-colors"
                  data-testid="increase-quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={addToCart}
                disabled={displayStock === 0}
                className="flex-1 bg-primary text-white py-4 px-6 font-semibold rounded-lg hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="add-to-cart-button"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={addToWishlist}
                className="w-14 h-14 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-all"
                data-testid="add-to-wishlist-button"
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={buyNow}
              disabled={displayStock === 0}
              className="w-full bg-secondary text-secondary-foreground py-4 px-6 font-semibold rounded-lg hover:bg-secondary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="buy-now-button"
            >
              Buy Now
            </button>
            
            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm leading-relaxed text-gray-600" data-testid="product-description">{product.description}</p>
              </div>
            )}

            {/* Premium Product Details Section */}
            {(product.dimensions || product.length || product.weight || product.sizes || product.material || product.color || product.brand || product.sku || product.laddu_gopal_sizes) && (
              <div className="mt-10 border-t border-primary/20 pt-8" data-testid="product-details-section">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Product Details</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.weight && (
                    <div className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        <span className="text-sm font-medium text-amber-700">Weight</span>
                      </div>
                      <span className="text-lg font-bold text-amber-900">
                        {product.weight_unit === 'kg' 
                          ? `${product.weight} kg` 
                          : (product.weight >= 1000 ? `${(product.weight/1000).toFixed(2)} kg` : `${product.weight} g`)
                        }
                      </span>
                    </div>
                  )}
                  
                  {product.material && (
                    <div className="group bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="text-sm font-medium text-purple-700">Material</span>
                      </div>
                      <span className="text-lg font-bold text-purple-900">{product.material}</span>
                    </div>
                  )}
                  
                  {product.color && !hasVariants && (
                    <div className="group bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="text-sm font-medium text-rose-700">Color</span>
                      </div>
                      <span className="text-lg font-bold text-rose-900">{product.color}</span>
                    </div>
                  )}
                  
                  {product.brand && (
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-700">Brand</span>
                      </div>
                      <span className="text-lg font-bold text-blue-900">{product.brand}</span>
                    </div>
                  )}
                  
                  {product.sku && (
                    <div className="group bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">SKU</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900 font-mono">{product.sku}</span>
                    </div>
                  )}
                  
                  {/* Dimensions - supports both nested dimensions object and flat fields */}
                  {(product.dimensions && (product.dimensions.length || product.dimensions.breadth || product.dimensions.height)) && (
                    <div className="group bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span className="text-sm font-medium text-teal-700">Dimensions (L×B×H)</span>
                      </div>
                      <span className="text-lg font-bold text-teal-900">
                        {product.dimensions.length || '-'} × {product.dimensions.breadth || '-'} × {product.dimensions.height || '-'} {product.dimensions.unit || 'cm'}
                      </span>
                    </div>
                  )}
                  
                  {/* Flat dimension fields (length, breadth, height as direct product fields) */}
                  {!product.dimensions && (product.length || product.breadth || product.height) && (
                    <div className="group bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/50 p-4 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span className="text-sm font-medium text-teal-700">Dimensions (L×B×H)</span>
                      </div>
                      <span className="text-lg font-bold text-teal-900">
                        {product.length || '-'} × {product.breadth || '-'} × {product.height || '-'} {product.dimension_unit || 'cm'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Laddu Gopal Sizes */}
                {product.laddu_gopal_sizes && product.laddu_gopal_sizes.length > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-heading font-bold text-amber-800">Laddu Gopal Sizes</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {product.laddu_gopal_sizes.sort().map((size, index) => (
                        <div 
                          key={index} 
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center shadow-lg shadow-amber-200"
                        >
                          {size}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sizes */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mt-6">
                    <span className="text-sm font-medium text-foreground block mb-3">Available Sizes</span>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size, index) => (
                        <span 
                          key={index} 
                          className="px-5 py-2.5 border-2 border-primary/30 bg-primary/5 text-sm font-semibold rounded-lg hover:border-primary hover:bg-primary/10 transition-all cursor-pointer"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="mt-6">
                    <span className="text-sm font-medium text-foreground block mb-3">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-4 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary text-sm font-medium rounded-full border border-primary/20"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold">Customer Reviews</h2>
            {user && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                data-testid="write-review-button"
              >
                Write a Review
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="bg-white border border-border/40 p-6 mb-8">
              <h3 className="text-xl font-heading font-semibold mb-4">Write Your Review</h3>
              <form onSubmit={submitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rating *</label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= reviewForm.rating ? "fill-secondary text-secondary" : "text-gray-300"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Your Review *</label>
                  <textarea
                    required
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full px-3 py-3 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    rows="4"
                    placeholder="Share your experience with this product..."
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewForm({ rating: 5, comment: "" });
                    }}
                    className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {product?.avg_rating && (
            <div className="bg-background-paper p-6 mb-8">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-accent">{product.avg_rating.toFixed(1)}</p>
                  <div className="flex items-center justify-center mt-2">
                    {renderStars(Math.round(product.avg_rating))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{product.review_count || reviews.length} reviews</p>
                </div>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-white border border-border/40">
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.review_id} className="bg-white border border-border/40 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{review.user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pb-8" data-testid="related-products-section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold">You May Also Like</h2>
                <p className="text-gray-600 text-sm mt-1">Products similar to what you&apos;re viewing</p>
              </div>
              
              {/* Navigation Arrows for larger screens */}
              {relatedProducts.length > 4 && (
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setRelatedSlide(Math.max(0, relatedSlide - 4))}
                    className={`p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors ${relatedSlide === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={relatedSlide === 0}
                    aria-label="Previous products"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setRelatedSlide(Math.min(relatedProducts.length - 4, relatedSlide + 4))}
                    className={`p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors ${relatedSlide >= relatedProducts.length - 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={relatedSlide >= relatedProducts.length - 4}
                    aria-label="Next products"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.slice(relatedSlide, relatedSlide + 4).map((rec) => (
                <Link
                  key={rec.product_id}
                  to={`/products/${rec.product_id}`}
                  className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden rounded-lg"
                  data-testid={`related-product-${rec.product_id}`}
                >
                  <div className="aspect-square overflow-hidden bg-white relative">
                    <ProductBadge type={rec.stock === 0 ? 'out-of-stock' : rec.badge || (rec.featured ? 'featured' : null)} />
                    <img
                      src={rec.images?.[0] || 'https://placehold.co/300x300?text=No+Image'}
                      alt={rec.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      style={{ backgroundColor: 'transparent' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/300x300?text=No+Image';
                      }}
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="text-sm md:text-base font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {rec.name}
                    </h3>
                    <p className="text-lg md:text-xl font-bold text-accent">₹{rec.price}</p>
                    {rec.laddu_gopal_sizes && rec.laddu_gopal_sizes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Size: {rec.laddu_gopal_sizes.join(', ')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Pagination Dots */}
            {relatedProducts.length > 4 && (
              <div className="flex justify-center items-center mt-6 space-x-2">
                {Array.from({ length: Math.ceil(relatedProducts.length / 4) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRelatedSlide(i * 4)}
                    className={`w-2 h-2 rounded-full transition-all ${relatedSlide === i * 4 ? 'bg-primary w-6' : 'bg-gray-300 hover:bg-gray-400'}`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
