import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ProductBadge from "@/components/ProductBadge";
import { optimizeImageUrl } from "@/utils/imageUtils";

// Fallback hero images - Mobile optimized (500px, q=40) and Desktop (1200px)
const fallbackHeroImages = [
  {
    mobile: "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=500&h=350&fit=crop&q=40&fm=webp",
    desktop: "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=1200&h=600&fit=crop&q=60&fm=webp"
  },
  {
    mobile: "https://images.unsplash.com/photo-1738754712726-d126c15e206b?w=500&h=350&fit=crop&q=40&fm=webp",
    desktop: "https://images.unsplash.com/photo-1738754712726-d126c15e206b?w=1200&h=600&fit=crop&q=60&fm=webp"
  },
  {
    mobile: "https://images.unsplash.com/photo-1768025719875-48ed072f3084?w=500&h=350&fit=crop&q=40&fm=webp",
    desktop: "https://images.unsplash.com/photo-1768025719875-48ed072f3084?w=1200&h=600&fit=crop&q=60&fm=webp"
  }
];

// Category images - smaller for better mobile performance
const defaultCategories = [
  { name: "Handicrafts", slug: "handicrafts", image: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?w=250&h=250&fit=crop&q=50&fm=webp" },
  { name: "Pooja Articles", slug: "pooja", image: "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg?auto=compress&cs=tinysrgb&w=250&h=250&fit=crop" },
  { name: "Perfumes", slug: "perfumes", image: "https://images.unsplash.com/photo-1758871992965-836e1fb0f9bc?w=250&h=250&fit=crop&q=50&fm=webp" },
  { name: "Jewellery", slug: "jewellery", image: "https://images.unsplash.com/photo-1738754719555-05aca36707b1?w=250&h=250&fit=crop&q=50&fm=webp" }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [belowHeroBanners, setBelowHeroBanners] = useState([]);
  const [popupBanner, setPopupBanner] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [categoriesData, setCategoriesData] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get display images - use database banners or fallback (responsive)
  const getHeroImageUrl = (index) => {
    if (heroBanners.length > 0) {
      const banner = heroBanners[index];
      if (isMobile && banner?.image_mobile) return banner.image_mobile;
      return banner?.image_desktop || banner?.image || '';
    }
    const fallback = fallbackHeroImages[index];
    return isMobile ? fallback?.mobile : fallback?.desktop;
  };

  const heroImages = heroBanners.length > 0 
    ? heroBanners 
    : fallbackHeroImages;

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, heroRes, belowHeroRes, popupRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/products?featured=true`),
        axios.get(`${API}/banners?placement=hero&status=active`),
        axios.get(`${API}/banners?placement=below_hero&status=active`),
        axios.get(`${API}/banners?placement=popup&status=active`),
        axios.get(`${API}/categories`)
      ]);

      setFeaturedProducts(productsRes.data.slice(0, 4));
      setHeroBanners(heroRes.data || []);
      setBelowHeroBanners(belowHeroRes.data || []);
      
      // Handle popup banner
      if (popupRes.data && popupRes.data.length > 0) {
        const popup = popupRes.data[0];
        const popupShown = sessionStorage.getItem(`popup_${popup.banner_id}`);
        if (!popupShown) {
          setPopupBanner(popup);
          const delay = popup.popup_delay || 2000;
          setTimeout(() => setShowPopup(true), delay);
        }
      }

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setCategoriesData(categoriesRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-slide for hero
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const closePopup = () => {
    setShowPopup(false);
    if (popupBanner) {
      sessionStorage.setItem(`popup_${popupBanner.banner_id}`, 'true');
      // Track impression
      axios.post(`${API}/banners/${popupBanner.banner_id}/impression`).catch(() => {});
    }
  };

  const handleBannerClick = async (banner) => {
    if (banner?.banner_id) {
      axios.post(`${API}/banners/${banner.banner_id}/click`).catch(() => {});
    }
  };

  const addToCart = async (productId) => {
    try {
      await axios.post(`${API}/cart/add`, { product_id: productId, quantity: 1 }, { withCredentials: true });
      toast.success("Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const getImageUrl = (banner) => {
    if (!banner) return '';
    // Check for mobile vs desktop
    const isMobile = window.innerWidth < 768;
    let url = isMobile && banner.image_mobile ? banner.image_mobile : (banner.image_desktop || banner.image || '');
    // Handle relative URLs
    if (url && url.startsWith('/api/')) {
      url = `${API}${url.replace('/api', '')}`;
    }
    return url;
  };

  return (
    <main className="min-h-screen">
      <SEO 
        title="Paridhaan Creations - Traditional Indian Handicrafts, Pooja Items & Jewellery | Shop Online"
        description="Discover authentic Indian handicrafts, brass pooja articles, traditional perfumes (attar), and artificial jewellery at Paridhaan Creations. Handcrafted by skilled artisans. Free shipping on orders above ₹999. COD available."
        keywords="paridhaan creations, indian handicrafts, pooja items, brass pooja thali, laddu gopal dress, traditional jewellery, kundan necklace, indian perfumes, attar, incense sticks, decorative items, handmade crafts india, handicrafts online shopping"
        breadcrumbs={[{ name: 'Home', url: '/' }]}
      />
      
      {/* Hero Section with Dynamic Banners */}
      <section className="relative h-[400px] md:h-[600px] overflow-hidden" data-testid="hero-section" role="region" aria-label="Featured promotions">
        {heroImages.map((item, index) => {
          const banner = heroBanners[index];
          const imageUrl = getHeroImageUrl(index);
          
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={index !== currentSlide}
            >
              {banner?.link ? (
                <Link 
                  to={banner.link} 
                  onClick={() => handleBannerClick(banner)}
                  className="block w-full h-full"
                  tabIndex={index === currentSlide ? 0 : -1}
                >
                  <img 
                    src={imageUrl} 
                    alt={banner?.title || `Promotional banner ${index + 1} - Shop handicrafts and traditional items`} 
                    className="w-full h-full object-cover"
                    width={isMobile ? "600" : "1200"}
                    height={isMobile ? "400" : "600"}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                    decoding={index === 0 ? "sync" : "async"}
                  />
                </Link>
              ) : (
                <img 
                  src={imageUrl} 
                  alt={banner?.title || `Promotional banner ${index + 1} - Shop handicrafts and traditional items`} 
                  className="w-full h-full object-cover"
                  width={isMobile ? "600" : "1200"}
                  height={isMobile ? "400" : "600"}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding={index === 0 ? "sync" : "async"}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/80"></div>
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-heading text-white mb-4 md:mb-6 tracking-tight" data-testid="hero-title">
              {heroBanners[currentSlide]?.title || "Paridhaan Creations"}
            </h1>
            <p className="text-base md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
              {heroBanners[currentSlide]?.cta_text || "Discover authentic Indian handicrafts, pooja articles, perfumes, and traditional jewellery"}
            </p>
            <Link
              to="/products"
              className="pointer-events-auto inline-block bg-white text-primary px-6 md:px-8 py-3 md:py-4 font-semibold tracking-wide hover:bg-gray-100 transition-all duration-300 hover:shadow-xl rounded-lg"
              data-testid="shop-now-button"
            >
              Shop Now
            </Link>
          </div>
        </div>

        {heroImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide((currentSlide - 1 + heroImages.length) % heroImages.length)}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-sm p-3 hover:bg-white/50 transition-all rounded-full"
              data-testid="hero-prev-button"
              aria-label="Previous slide"
              type="button"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
            </button>
            <button
              onClick={() => setCurrentSlide((currentSlide + 1) % heroImages.length)}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-sm p-3 hover:bg-white/50 transition-all rounded-full"
              data-testid="hero-next-button"
              aria-label="Next slide"
              type="button"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
            </button>
            
            {/* Slide indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Slide indicators">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-8 md:w-10" : "bg-white/60"
                  }`}
                  data-testid={`hero-indicator-${index}`}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-selected={index === currentSlide}
                  role="tab"
                  type="button"
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Below Hero Banners */}
      {belowHeroBanners.length > 0 && (
        <section className="py-8 md:py-12 bg-background-paper" data-testid="below-hero-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`grid gap-4 md:gap-6 ${belowHeroBanners.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {belowHeroBanners.map((banner) => (
                <Link
                  key={banner.banner_id}
                  to={banner.link || '/products'}
                  onClick={() => handleBannerClick(banner)}
                  className="relative overflow-hidden group rounded-lg shadow-md hover:shadow-xl transition-shadow"
                  data-testid={`below-hero-banner-${banner.banner_id}`}
                >
                  <img 
                    src={getImageUrl(banner)} 
                    alt={banner.title || 'Promotional banner'} 
                    className="w-full h-48 md:h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {banner.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 md:p-6">
                        <h3 className="text-xl md:text-2xl font-heading font-semibold text-white">{banner.title}</h3>
                        {banner.cta_text && (
                          <span className="text-secondary font-medium mt-2 inline-block">{banner.cta_text} →</span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-16 md:py-24" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 id="categories-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3 md:mb-4" data-testid="categories-title">Shop by Category</h2>
            <p className="text-base md:text-lg text-gray-600">Explore our curated collections</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {categoriesData.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative overflow-hidden bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl rounded-lg"
                data-testid={`category-${category.slug}`}
                aria-label={`Shop ${category.name} - Browse our ${category.name.toLowerCase()} collection`}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={optimizeImageUrl(category.image, isMobile ? 200 : 400, isMobile ? 200 : 400)}
                    alt={`${category.name} collection - Traditional ${category.name.toLowerCase()} items`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    width={isMobile ? "200" : "400"}
                    height={isMobile ? "200" : "400"}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex items-end">
                  <h3 className="text-lg md:text-2xl font-heading font-semibold text-white p-4 md:p-6">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-50" aria-labelledby="featured-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 md:mb-16">
              <h2 id="featured-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3 md:mb-4" data-testid="featured-title">Featured Products</h2>
              <p className="text-base md:text-lg text-gray-600">Handpicked treasures for you</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {featuredProducts.map((product) => (
                <article
                  key={product.product_id}
                  className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden rounded-lg"
                  data-testid={`product-${product.product_id}`}
                >
                  <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative">
                    <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
                    <img
                      src={optimizeImageUrl(product.images[0], isMobile ? 200 : 300, isMobile ? 200 : 300)}
                      alt={`${product.name} - ₹${product.price}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      width={isMobile ? "200" : "300"}
                      height={isMobile ? "200" : "300"}
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                  <div className="p-4 md:p-6">
                    <Link to={`/products/${product.product_id}`}>
                      <h3 className="text-base md:text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-xl md:text-2xl font-bold text-primary mb-3 md:mb-4">₹{product.price}</p>
                    <button
                      onClick={() => addToCart(product.product_id)}
                      className="w-full bg-primary text-white py-2 md:py-3 text-sm md:text-base font-medium hover:bg-primary/90 transition-all duration-300 rounded"
                      data-testid={`add-to-cart-${product.product_id}`}
                      aria-label={`Add ${product.name} to cart`}
                      type="button"
                    >
                      Add to Cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popup Banner */}
      {showPopup && popupBanner && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closePopup}
          data-testid="popup-overlay"
        >
          <div 
            className="relative bg-white rounded-lg overflow-hidden max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
            data-testid="popup-banner"
          >
            <button
              onClick={closePopup}
              className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1 hover:bg-white transition-colors"
              data-testid="popup-close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            
            {popupBanner.link ? (
              <Link 
                to={popupBanner.link} 
                onClick={() => { handleBannerClick(popupBanner); closePopup(); }}
              >
                <img 
                  src={getImageUrl(popupBanner)} 
                  alt={popupBanner.title || 'Special offer'} 
                  className="w-full h-auto"
                />
                {popupBanner.title && (
                  <div className="p-4 text-center">
                    <h3 className="text-xl font-heading font-semibold">{popupBanner.title}</h3>
                    {popupBanner.cta_text && (
                      <span className="text-primary font-medium mt-2 inline-block">{popupBanner.cta_text}</span>
                    )}
                  </div>
                )}
              </Link>
            ) : (
              <>
                <img 
                  src={getImageUrl(popupBanner)} 
                  alt={popupBanner.title || 'Special offer'} 
                  className="w-full h-auto"
                />
                {popupBanner.title && (
                  <div className="p-4 text-center">
                    <h3 className="text-xl font-heading font-semibold">{popupBanner.title}</h3>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
