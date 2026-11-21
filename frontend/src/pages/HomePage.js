import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ProductBadge from "@/components/ProductBadge";
import { optimizeImageUrl } from "@/utils/imageUtils";
import { LadduGopalSizeSelector } from "@/components/LadduGopalSizeGuide";
import USPStrip from "@/components/USPStrip";

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
  { name: "Pooja Articles", slug: "pooja", image: "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg?auto=compress&cs=tinysrgb&w=250&h=250&fit=crop" }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [belowHeroBanners, setBelowHeroBanners] = useState([]);
  const [popupBanner, setPopupBanner] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [categoriesData, setCategoriesData] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [featuredSlide, setFeaturedSlide] = useState(0);
  const [collections, setCollections] = useState([]);
  const [instagramVideos, setInstagramVideos] = useState([]);
  const [expandedVideo, setExpandedVideo] = useState(null); // For inline video expansion

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
      return banner?.image_desktop || banner?.image_url || banner?.image || '';
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
      const [productsRes, heroRes, belowHeroRes, popupRes, categoriesRes, collectionsRes, instagramRes] = await Promise.all([
        axios.get(`${API}/products?featured=true`),
        axios.get(`${API}/banners?placement=hero&status=active`),
        axios.get(`${API}/banners?placement=below_hero&status=active`),
        axios.get(`${API}/banners?placement=popup&status=active`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/collections?is_featured=true`),
        axios.get(`${API}/instagram-videos`).catch(() => ({ data: [] }))
      ]);

      // Sort featured products by created_at (newest first)
      let sortedFeatured = productsRes.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // FALLBACK: If no featured products, fetch latest products
      if (sortedFeatured.length === 0) {
        try {
          const latestRes = await axios.get(`${API}/products?limit=8`);
          sortedFeatured = latestRes.data
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8);
        } catch (e) {
          console.log("Could not fetch latest products as fallback");
        }
      }
      
      setFeaturedProducts(sortedFeatured);
      setHeroBanners(heroRes.data || []);
      setBelowHeroBanners(belowHeroRes.data || []);
      setCollections(collectionsRes.data || []);
      setInstagramVideos(instagramRes.data || []);
      
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
        // Filter only main categories (no parent_id) and exclude artificial-jewellery
        const mainCategories = categoriesRes.data.filter(c => !c.parent_id && c.slug !== 'artificial-jewellery');
        setCategoriesData(mainCategories.length > 0 ? mainCategories : defaultCategories);
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
    
    // Navigate based on banner link or collection
    if (banner?.link) {
      if (banner.link.startsWith('http')) {
        window.open(banner.link, '_blank');
      } else {
        navigate(banner.link);
      }
    } else if (banner?.collection_slug) {
      navigate(`/collection/${banner.collection_slug}`);
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
    let url = isMobile && banner.image_mobile ? banner.image_mobile : (banner.image_desktop || banner.image_url || banner.image || '');
    // Handle relative URLs
    if (url && url.startsWith('/api/')) {
      url = `${API}${url.replace('/api', '')}`;
    }
    return url;
  };

  return (
    <main className="min-h-screen">
      <SEO 
        title="Paridhaan Creations - Buy Handicrafts, Pooja Articles & Traditional Decor Online"
        description="Shop authentic Indian handicrafts, brass pooja articles, laddu gopal dresses, incense sticks, temple decor & pooja samagri at Paridhaan Creations. Handcrafted by artisans from Vrindavan & Barsana. Free shipping above Rs.999. COD available."
        keywords="paridhaan creations, indian handicrafts online, pooja items online, brass pooja thali, laddu gopal dress, incense sticks, agarbatti, decorative items, handmade crafts india, handicrafts online shopping, pooja samagri, religious items, vrindavan shopping, temple decoration, god dress online, aarti thali, dhoop batti, camphor, pooja bell"
        breadcrumbs={[{ name: 'Home', url: '/' }]}
      />
      
      {/* Hero Section with Dynamic Banners
          Aspect-ratio based container matches admin's recommended upload
          sizes: mobile 800x1000 (4:5) → aspect-[4/5]; desktop 1920x750 →
          aspect-[1920/750]. Scales fluidly across all viewport widths,
          no fixed pixel heights that letterbox on 4K or crop on small laptops. */}
      <section className="relative w-full aspect-[4/5] md:aspect-[1920/750] overflow-hidden" data-testid="hero-section" role="region" aria-label="Featured promotions">
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
              {/* Subtle dark gradient (not primary) so the image stays vivid
                  and only the bottom gets enough dimming for text readability. */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/55"></div>
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-heading text-white mb-4 md:mb-6 tracking-tight" data-testid="hero-title">
              {heroBanners[currentSlide]?.title || "Paridhaan Creations"}
            </h1>
            <p className="text-base md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
              {heroBanners[currentSlide]?.cta_text || "Discover authentic Indian handicrafts and pooja articles"}
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

      {/* USP / Trust Strip — backend-driven (admin: USP Strip tab) */}
      <USPStrip />

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
                  className="relative overflow-hidden group rounded-lg shadow-md hover:shadow-xl transition-shadow aspect-[3/1]"
                  data-testid={`below-hero-banner-${banner.banner_id}`}
                >
                  {/* 3:1 aspect matches admin-recommended 1200x400 upload */}
                  <img
                    src={getImageUrl(banner)}
                    alt={banner.title || 'Promotional banner'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
      <section className="py-16 md:py-24 vrindavan-bg" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Divine Section Header */}
          <div className="text-center mb-10 md:mb-16">
            <div className="divine-divider mb-4">
              <span className="text-2xl">🙏</span>
            </div>
            <h2 id="categories-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3 md:mb-4" data-testid="categories-title">Shop by Category</h2>
            <p className="text-base md:text-lg text-gray-600">Explore our curated collections</p>
          </div>

          {/* Centered grid for 3 categories - responsive */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {categoriesData.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative overflow-hidden bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl rounded-lg w-[calc(50%-8px)] sm:w-[calc(33.333%-22px)] lg:w-[280px]"
                data-testid={`category-${category.slug}`}
                aria-label={`Shop ${category.name} - Browse our ${category.name.toLowerCase()} collection`}
              >
                <div className="aspect-square overflow-hidden bg-white">
                  <img
                    src={category.image}
                    alt={`${category.name} collection - Traditional ${category.name.toLowerCase()} items`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x400?text=' + category.name;
                    }}
                  />
                </div>
                {/* Same treatment as hero — neutral darkening, not a primary-color wash */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                  <h3 className="text-lg md:text-2xl font-heading font-semibold text-white p-4 md:p-6">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Festival Collections Section */}
      {collections.length > 0 && (
        <section className="py-12 md:py-20 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50" aria-labelledby="collections-heading" data-testid="collections-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Special Collections</span>
              </div>
              <h2 id="collections-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3" data-testid="collections-title">
                <span className="text-[#8B1538]">🪔</span> Festival Collections <span className="text-[#8B1538]">🪔</span>
              </h2>
              <p className="text-base md:text-lg text-gray-600">Curated selections for every celebration</p>
              <p className="text-sm text-[#D4AF37] font-medium mt-2 font-['Noto_Sans_Devanagari']">हर त्योहार को खास बनाएं</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {collections.map((collection) => (
                <Link
                  key={collection.collection_id}
                  to={`/collection/${collection.slug}`}
                  className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300"
                  data-testid={`collection-${collection.slug}`}
                >
                  {/* Collection Image */}
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={collection.image || 'https://placehold.co/400x300?text=' + encodeURIComponent(collection.name)}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/400x300?text=' + encodeURIComponent(collection.name);
                      }}
                    />
                  </div>
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Badge */}
                  {collection.badge_text && (
                    <div 
                      className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: collection.badge_color || '#ef4444' }}
                    >
                      {collection.badge_text}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg md:text-xl font-heading font-bold text-white mb-1 group-hover:text-orange-200 transition-colors">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-xs md:text-sm text-white/80 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <span className="inline-flex items-center mt-2 text-orange-300 text-sm font-medium group-hover:text-orange-200">
                      Explore Collection
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Laddu Gopal Size Guide Section */}
      <LadduGopalSizeSelector />

      {/* Featured Products with Slider */}
      {featuredProducts.length > 0 && (
        <section className="py-16 md:py-24 barsana-theme" aria-labelledby="featured-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Divine Peacock Divider */}
            <div className="divine-divider mb-6">
              <span className="text-2xl">🦚</span>
            </div>
            <div className="text-center mb-10 md:mb-16">
              <h2 id="featured-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3 md:mb-4" data-testid="featured-title">
                {featuredProducts.some(p => p.featured || p.is_featured) ? "Featured Products" : "Latest Products"}
              </h2>
              <p className="text-base md:text-lg text-gray-600">
                {featuredProducts.some(p => p.featured || p.is_featured) ? "Handpicked treasures for you" : "Fresh arrivals in our collection"}
              </p>
            </div>

            {/* Products Grid with Navigation */}
            <div className="relative">
              {/* Navigation Arrows - show only if more than 4 products */}
              {featuredProducts.length > 4 && (
                <>
                  <button
                    onClick={() => setFeaturedSlide(Math.max(0, featuredSlide - 4))}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-all ${featuredSlide === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={featuredSlide === 0}
                    aria-label="Previous products"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setFeaturedSlide(Math.min(featuredProducts.length - 4, featuredSlide + 4))}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-all ${featuredSlide >= featuredProducts.length - 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={featuredSlide >= featuredProducts.length - 4}
                    aria-label="Next products"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {featuredProducts.slice(featuredSlide, featuredSlide + (isMobile ? 4 : 4)).map((product) => (
                  <article
                    key={product.product_id}
                    className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden rounded-lg"
                    data-testid={`product-${product.product_id}`}
                  >
                    <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative bg-white">
                      <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
                      {/* Primary Image */}
                      <img
                        src={product.images?.[0] || 'https://placehold.co/300x300?text=No+Image'}
                        alt={`${product.name} - ₹${product.price}`}
                        className={`w-full h-full object-contain p-2 transition-all duration-500 ${product.images?.length > 1 ? 'group-hover:opacity-0 group-hover:scale-110' : 'group-hover:scale-105'}`}
                        loading="lazy"
                        decoding="async"
                        style={{ backgroundColor: 'transparent' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/300x300?text=No+Image';
                        }}
                      />
                      {/* Secondary Image on Hover */}
                      {product.images?.length > 1 && (
                        <img
                          src={product.images[1]}
                          alt={`${product.name} - alternate view`}
                          className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:scale-100"
                          loading="lazy"
                          decoding="async"
                          style={{ backgroundColor: 'transparent' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </Link>
                    <div className="p-4 md:p-6">
                      <Link to={`/products/${product.product_id}`}>
                        <h3 className="text-base md:text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="mb-3 md:mb-4">
                        <span className="text-xl md:text-2xl font-bold text-primary">₹{product.price}</span>
                        {product.mrp && product.mrp > product.price && (
                          <>
                            <span className="text-sm md:text-base text-muted-foreground line-through ml-2">₹{product.mrp}</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>
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

              {/* Pagination Dots */}
              {featuredProducts.length > 4 && (
                <div className="flex justify-center items-center mt-8 space-x-3">
                  <button
                    onClick={() => setFeaturedSlide(Math.max(0, featuredSlide - 4))}
                    disabled={featuredSlide === 0}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-sm"
                  >
                    ← Prev
                  </button>
                  
                  {Array.from({ length: Math.ceil(featuredProducts.length / 4) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeaturedSlide(i * 4)}
                      className={`w-8 h-8 rounded-full font-medium transition-all ${featuredSlide === i * 4 ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                      aria-label={`Go to page ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setFeaturedSlide(Math.min(featuredProducts.length - 4, featuredSlide + 4))}
                    disabled={featuredSlide >= featuredProducts.length - 4}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-sm"
                  >
                    Next →
                  </button>
                </div>
              )}
              
              {/* Showing count */}
              <p className="text-center text-sm text-muted-foreground mt-3">
                Showing {featuredSlide + 1}-{Math.min(featuredSlide + 4, featuredProducts.length)} of {featuredProducts.length} featured products
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Instagram Showcase Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-[#FFF8E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="divine-divider mb-4">
              <span className="text-2xl">🎬</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-3">
              Our Video Showcase
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-2">
              Watch Our Products In Action
            </p>
            <a 
              href="https://instagram.com/paridhaancreations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#E91E8C] hover:text-[#8B1538] font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @paridhaancreations
            </a>
          </div>

          {/* Video Grid - Satvik Store Style */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {instagramVideos.length > 0 ? (
              instagramVideos.slice(0, 6).map((video, index) => (
                <div
                  key={video.video_id || index}
                  className="group relative overflow-hidden rounded-xl bg-gray-900 shadow-lg aspect-[9/16]"
                >
                  {/* Video Player - Direct playback with controls */}
                  {video.video_url ? (
                    <video
                      src={video.video_url}
                      poster={video.thumbnail_url}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : video.thumbnail_url ? (
                    <>
                      <img 
                        src={video.thumbnail_url}
                        alt={video.caption || "Video thumbnail"}
                        className="w-full h-full object-cover"
                      />
                      {/* Play icon for thumbnails without video */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/90 rounded-full p-4 shadow-lg">
                          <svg className="w-8 h-8 text-[#8B1538]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#8B1538]/30 to-[#D4AF37]/30 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Caption Overlay */}
                  {video.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none">
                      <p className="text-white text-xs font-medium truncate">{video.caption}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Placeholder when no videos
              [1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gradient-to-br from-[#8B1538]/10 to-[#D4AF37]/10 shadow-lg"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      <p className="text-sm font-medium">No Videos</p>
                      <p className="text-xs">Add from Admin Panel</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Visit Instagram Button */}
          <div className="text-center mt-8">
            <a
              href="https://instagram.com/paridhaancreations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8B1538] to-[#E91E8C] text-white px-8 py-3 rounded-full font-semibold hover:from-[#6B0F2A] hover:to-[#C41E6C] transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
              </svg>
              Follow on Instagram
            </a>
          </div>
        </div>
      </section>

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
