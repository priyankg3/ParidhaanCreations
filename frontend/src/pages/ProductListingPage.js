import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Search, SlidersHorizontal, Heart, X, Ruler, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ProductBadge from "@/components/ProductBadge";
import { optimizeImageUrl } from "@/utils/imageUtils";
import { LadduGopalSizeGuideModal, LadduGopalSizeBadge, SizeGuideButton } from "@/components/LadduGopalSizeGuide";

const categoryBanners = {
  handicrafts: {
    image: "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=1400&h=300&fit=crop&q=60&fm=webp",
    title: "Handcrafted Treasures",
    description: "Authentic Indian handicrafts by skilled artisans"
  },
  pooja: {
    image: "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg?auto=compress&cs=tinysrgb&w=1400&h=300&fit=crop",
    title: "Sacred Pooja Collection",
    description: "Essential items for worship and spiritual practices"
  }
};

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sortBy, setSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryBannersData, setCategoryBannersData] = useState({ header: null, side: null, footer: null });
  const [ladduGopalSize, setLadduGopalSize] = useState(searchParams.get("laddu_gopal_size") || "");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [filters, setFilters] = useState({
    inStock: false,
    featured: false,
    minPrice: 0,
    maxPrice: 10000
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 9;

  const [dbCategories, setDbCategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const ladduGopalSizes = ["0", "1", "2", "3", "4", "5", "6", "6+"];

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setDbCategories(response.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      let url = `${API}/products`;
      const params = new URLSearchParams();
      if (ladduGopalSize) params.append("laddu_gopal_size", ladduGopalSize);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      setProducts(response.data);
      
      const prices = response.data.map(p => p.price);
      const max = Math.max(...prices, 10000);
      setMaxPrice(max);
      setPriceRange([0, max]);
      setFilters(prev => ({ ...prev, maxPrice: max }));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  }, [ladduGopalSize]);

  const fetchCategoryBanners = useCallback(async (category) => {
    try {
      const [headerRes, sideRes, footerRes] = await Promise.all([
        axios.get(`${API}/banners?placement=category_header&category=${category}&status=active`),
        axios.get(`${API}/banners?placement=category_sidebar&category=${category}&status=active`),
        axios.get(`${API}/banners?placement=category_footer&category=${category}&status=active`)
      ]);
      
      setCategoryBannersData({
        header: headerRes.data[0] || null,
        side: sideRes.data[0] || null,
        footer: footerRes.data[0] || null
      });
    } catch (error) {
      console.error("Error fetching category banners:", error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      fetchCategoryBanners(categoryParam);
    } else {
      setCategoryBannersData({ header: null, side: null, footer: null });
    }
  }, [searchParams, fetchCategoryBanners]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubcategory) {
      // Filter by subcategory
      filtered = filtered.filter(p => p.category === selectedSubcategory || p.subcategory === selectedSubcategory);
    } else if (selectedCategory) {
      // Filter by main category (includes products in subcategories of this category)
      const categoryObj = dbCategories.find(c => c.slug === selectedCategory);
      const subcategorySlugs = categoryObj?.subcategories?.map(s => s.slug) || [];
      filtered = filtered.filter(p => 
        p.category === selectedCategory || subcategorySlugs.includes(p.category) || subcategorySlugs.includes(p.subcategory)
      );
    }

    // Laddu Gopal size filter (frontend filtering for products that have this size)
    if (ladduGopalSize && selectedCategory === 'pooja') {
      filtered = filtered.filter(p => 
        p.laddu_gopal_sizes && p.laddu_gopal_sizes.includes(ladduGopalSize)
      );
    }

    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured);
    }

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "popular":
        filtered.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        break;
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedSubcategory, dbCategories, priceRange, sortBy, filters, ladduGopalSize]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceRange, sortBy, filters, ladduGopalSize]);

  const addToCart = async (productId) => {
    try {
      await axios.post(`${API}/cart/add`, { product_id: productId, quantity: 1 }, { withCredentials: true });
      toast.success("Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const addToWishlist = async (productId) => {
    try {
      await axios.post(`${API}/wishlist/add/${productId}`, {}, { withCredentials: true });
      toast.success("Added to wishlist!");
    } catch (error) {
      toast.error("Please login to add to wishlist");
    }
  };

  const getImageUrl = (banner) => {
    if (!banner) return '';
    let url = banner.image_desktop || banner.image || '';
    if (url && url.startsWith('/api/')) {
      url = `${API}${url.replace('/api', '')}`;
    }
    return url;
  };

  const handleBannerClick = (banner) => {
    if (banner?.banner_id) {
      axios.post(`${API}/banners/${banner.banner_id}/click`).catch(() => {});
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setPriceRange([0, maxPrice]);
    setLadduGopalSize("");
    setFilters({
      inStock: false,
      featured: false,
      minPrice: 0,
      maxPrice: maxPrice
    });
    setSortBy("name");
  };

  const categoryBanner = selectedCategory ? categoryBanners[selectedCategory] : null;
  const headerBanner = categoryBannersData.header;
  const sideBanner = categoryBannersData.side;
  const footerBanner = categoryBannersData.footer;

  // SEO optimized titles and descriptions
  const categoryKeywords = {
    handicrafts: "brass decorative items, wooden carvings, handmade crafts, indian handicrafts online",
    pooja: "pooja thali, laddu gopal dress, brass diya, incense holder, pooja samagri"
  };

  const seoTitle = selectedCategory 
    ? `${categoryBanners[selectedCategory]?.title || selectedCategory} - Buy Online at Paridhaan Creations`
    : "Shop All Products - Handicrafts & Pooja Items | Paridhaan Creations";
  
  const seoDescription = selectedCategory
    ? `Buy authentic ${categoryBanners[selectedCategory]?.title || selectedCategory} online at Paridhaan Creations. ${categoryBanners[selectedCategory]?.description || ''}. Free shipping on orders above ₹999. COD available.`
    : "Browse our complete collection of traditional Indian handicrafts and brass pooja articles. Handcrafted by skilled artisans.";

  const seoKeywords = selectedCategory 
    ? categoryKeywords[selectedCategory] || `${selectedCategory}, paridhaan creations`
    : "indian handicrafts, pooja items, traditional items, paridhaan creations";

  return (
    <div className="min-h-screen">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        category={selectedCategory ? { name: categoryBanners[selectedCategory]?.title, productCount: filteredProducts.length } : null}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          ...(selectedCategory ? [{ name: categoryBanners[selectedCategory]?.title || selectedCategory, url: `/products?category=${selectedCategory}` }] : [])
        ]}
      />
      
      {/* Header Banner from DB or fallback to category banner */}
      {headerBanner ? (
        /* 4:1 aspect matches admin-recommended 1600x400 category_header upload.
           Mobile uses a slightly taller 2:1 so the banner reads well on phones
           without demanding a separate mobile image. */
        <div className="relative w-full aspect-[2/1] md:aspect-[4/1] overflow-hidden" data-testid={`header-banner-${selectedCategory}`}>
          {headerBanner.link ? (
            <a href={headerBanner.link} onClick={() => handleBannerClick(headerBanner)} className="block w-full h-full">
              <img src={getImageUrl(headerBanner)} alt={headerBanner.title || 'Category banner'} className="w-full h-full object-cover" loading="lazy" />
            </a>
          ) : (
            <img src={getImageUrl(headerBanner)} alt={headerBanner.title || 'Category banner'} className="w-full h-full object-cover" loading="lazy" />
          )}
          {/* Neutral dark overlay — just enough for text contrast, image stays vivid.
              (Replaced primary-color wash that turned the image muddy brown.) */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 drop-shadow-lg">{headerBanner.title || categoryBanner?.title || 'Products'}</h1>
              {headerBanner.cta_text && (
                <p className="text-lg md:text-xl drop-shadow-md">{headerBanner.cta_text}</p>
              )}
            </div>
          </div>
        </div>
      ) : categoryBanner && (
        /* Same 4:1 aspect as header banner for consistency with hard-coded fallbacks. */
        <div className="relative w-full aspect-[2/1] md:aspect-[4/1] overflow-hidden" data-testid={`category-banner-${selectedCategory}`}>
          <img src={categoryBanner.image} alt={categoryBanner.title} className="w-full h-full object-cover" loading="lazy" />
          {/* Neutral dark overlay (replaced primary-color wash) */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 drop-shadow-lg">{categoryBanner.title}</h1>
              <p className="text-lg md:text-xl drop-shadow-md">{categoryBanner.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Beautiful Subcategories Section - Shows when parent category is selected */}
      {selectedCategory && !selectedSubcategory && (() => {
        const currentCategory = dbCategories.find(c => c.slug === selectedCategory);
        const subcats = currentCategory?.subcategories || [];
        
        if (subcats.length === 0) return null;
        
        // Category-specific styling - Rajasthani theme
        const categoryStyles = {
          'pooja': {
            gradient: 'from-orange-50 via-amber-50 to-yellow-50',
            frameBorder: 'border-[#D4AF37]',
            frameDecor: 'bg-gradient-to-br from-[#8B1538] to-[#6B0F2A]',
            textColor: 'text-[#8B1538]',
            icon: '🪔',
            title: 'Divine Pooja Collection',
            subtitle: ''
          },
          'handicrafts': {
            gradient: 'from-amber-50 via-orange-50 to-red-50',
            frameBorder: 'border-orange-400',
            frameDecor: 'bg-gradient-to-br from-orange-500 to-amber-600',
            textColor: 'text-orange-700',
            icon: '🏺',
            title: 'Artisan Handicrafts',
            subtitle: ''
          }
        };
        
        const style = categoryStyles[selectedCategory] || categoryStyles['pooja'];
        
        return (
          <section className={`py-10 md:py-16 bg-gradient-to-r ${style.gradient}`} data-testid="subcategories-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header with Rajasthani Flair */}
              <div className="text-center mb-10 md:mb-14">
                <div className="inline-flex items-center gap-4 mb-4">
                  {/* Decorative Left */}
                  <div className="hidden sm:flex items-center gap-1">
                    <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-[#D4AF37]"></div>
                    <div className="w-3 h-3 rotate-45 border-2 border-[#D4AF37]"></div>
                  </div>
                  
                  <div className={`w-14 h-14 ${style.frameDecor} rounded-full flex items-center justify-center shadow-xl ring-4 ring-[#D4AF37]/30`}>
                    <span className="text-2xl">{style.icon}</span>
                  </div>
                  
                  {/* Decorative Right */}
                  <div className="hidden sm:flex items-center gap-1">
                    <div className="w-3 h-3 rotate-45 border-2 border-[#D4AF37]"></div>
                    <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-[#D4AF37]"></div>
                  </div>
                </div>
                
                <h2 className={`text-2xl md:text-4xl font-heading font-bold ${style.textColor}`}>
                  {style.title}
                </h2>
              </div>
              
              {/* Rajasthani Style Subcategory Cards - Horizontal Slider */}
              <div className="relative group/slider">
                {/* Left Arrow */}
                <button
                  onClick={() => {
                    const container = document.getElementById('subcats-slider');
                    if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center border-2 border-[#D4AF37] text-[#8B1538] hover:scale-110 transition-all -ml-4 hidden lg:flex"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                {/* Right Arrow */}
                <button
                  onClick={() => {
                    const container = document.getElementById('subcats-slider');
                    if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center border-2 border-[#D4AF37] text-[#8B1538] hover:scale-110 transition-all -mr-4 hidden lg:flex"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Slider Container */}
                <div id="subcats-slider" className="overflow-x-auto pb-4 scrollbar-hide scroll-smooth px-2">
                  <div className="flex gap-5 md:gap-6">
                {subcats.map((sub, index) => {
                  // Default placeholder image if no image uploaded
                  const subcatImage = sub.image || `https://placehold.co/300x300/8B1538/D4AF37?text=${encodeURIComponent(sub.name)}`;
                  
                  return (
                    <button
                      key={sub.category_id}
                      onClick={() => {
                        setSelectedSubcategory(sub.slug);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group relative flex-shrink-0 w-40 sm:w-44 md:w-48"
                      data-testid={`subcategory-card-${sub.slug}`}
                    >
                      {/* Rajasthani Frame Card */}
                      <div className="relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-4 border-[#D4AF37]/60 hover:border-[#D4AF37]">
                        {/* Decorative Corner Elements - Rajasthani Style */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#8B1538] rounded-tl-lg z-10"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#8B1538] rounded-tr-lg z-10"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#8B1538] rounded-bl-lg z-10"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#8B1538] rounded-br-lg z-10"></div>
                        
                        {/* Image Container */}
                        <div className="aspect-square overflow-hidden p-2">
                          <div className="w-full h-full rounded-lg overflow-hidden border-2 border-[#D4AF37]/30">
                            <img
                              src={subcatImage}
                              alt={sub.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://placehold.co/300x300/8B1538/D4AF37?text=${encodeURIComponent(sub.name)}`;
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Name Banner with Rajasthani Pattern */}
                        <div className="relative bg-gradient-to-r from-[#8B1538] via-[#6B0F2A] to-[#8B1538] py-3 px-3">
                          {/* Pattern Overlay */}
                          <div className="absolute inset-0 opacity-20" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`
                          }}></div>
                          
                          <h3 className="relative text-sm md:text-base font-bold text-white text-center line-clamp-2 drop-shadow-md">
                            {sub.name}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Hover Glow Effect */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-[#8B1538] to-[#D4AF37] rounded-xl opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500 -z-10"></div>
                    </button>
                  );
                })}
                  </div>
                </div>
                
                {/* Scroll indicator for mobile */}
                <div className="flex justify-center mt-4 lg:hidden">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>←</span>
                    <span>Swipe to see more</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
              
              {/* View All Products Button - Rajasthani Style */}
              <div className="text-center mt-10 md:mt-14">
                <button
                  onClick={() => {
                    // Show all products for this category (no subcategory filter)
                    setSelectedSubcategory(null);
                    // Scroll to products section
                    setTimeout(() => {
                      const productsSection = document.querySelector('[data-testid="products-grid"]');
                      if (productsSection) {
                        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                  className="relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#8B1538] via-[#6B0F2A] to-[#8B1538] text-white rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-[#D4AF37]"
                >
                  {/* Button decorations */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#D4AF37] rotate-45"></span>
                  <span className="ml-3">View All {currentCategory?.name || 'Products'}</span>
                  <span className="text-xl">→</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#D4AF37] rotate-45"></span>
                </button>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Selected Subcategory Breadcrumb */}
      {selectedSubcategory && (() => {
        const currentCategory = dbCategories.find(c => c.slug === selectedCategory);
        const currentSubcategory = currentCategory?.subcategories?.find(s => s.slug === selectedSubcategory);
        
        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-[#D4AF37]/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedCategory(''); setSelectedSubcategory(null); }}
                  className="text-gray-500 hover:text-[#8B1538] transition-colors text-sm"
                >
                  All Products
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="text-gray-500 hover:text-[#8B1538] transition-colors text-sm"
                >
                  {currentCategory?.name}
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-[#8B1538] font-semibold text-sm flex items-center gap-1">
                  <span className="text-[#D4AF37]">✦</span>
                  {currentSubcategory?.name}
                </span>
                
                {/* Clear subcategory button */}
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors bg-white px-3 py-1 rounded-full border"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!categoryBanner && !headerBanner && (
            <div className="mb-12">
              <h1 className="text-5xl font-heading font-bold mb-6" data-testid="products-title">Our Products</h1>
            </div>
          )}

          {/* Mobile Category Dropdown - Only visible on mobile */}
          <div className="lg:hidden mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">Select Category</label>
            <select
              value={selectedCategory || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCategory(value || null);
                setSelectedSubcategory(null);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="">All Products</option>
              {dbCategories.filter(c => !c.parent_id && c.slug !== 'artificial-jewellery').map(cat => (
                <option key={cat.category_id} value={cat.slug}>
                  {cat.slug === 'pooja' ? '🪔 ' : '🏺 '}{cat.name}
                </option>
              ))}
            </select>
            
            {/* Subcategory dropdown if category selected */}
            {selectedCategory && dbCategories.find(c => c.slug === selectedCategory)?.subcategories?.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2 text-gray-700">Select Subcategory</label>
                <select
                  value={selectedSubcategory || ""}
                  onChange={(e) => setSelectedSubcategory(e.target.value || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                  <option value="">All {dbCategories.find(c => c.slug === selectedCategory)?.name}</option>
                  {dbCategories.find(c => c.slug === selectedCategory)?.subcategories?.map(sub => (
                    <option key={sub.category_id} value={sub.slug}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white border border-border/40 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-heading font-bold">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary text-sm"
                        data-testid="search-input"
                      />
                    </div>
                  </div>

                  {/* Beautiful Category Filter - Spiritual Theme */}
                  <div>
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#D4AF37]">🪔</span>
                      <span>Shop by Category</span>
                    </label>
                    
                    {/* All Categories Button */}
                    <button
                      onClick={() => { setSelectedCategory(""); setSelectedSubcategory(null); }}
                      className={`w-full mb-3 px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        selectedCategory === "" && !selectedSubcategory
                          ? "bg-gradient-to-r from-[#8B1538] to-[#6B0F2A] text-white border-[#8B1538] shadow-lg"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37] hover:bg-amber-50"
                      }`}
                    >
                      <span className="text-lg">🛒</span>
                      <span className="font-medium">All Products</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === "" ? "bg-white/20" : "bg-gray-100"
                      }`}>
                        {products.length}
                      </span>
                    </button>

                    {/* Category Cards */}
                    <div className="space-y-2">
                      {dbCategories.filter(cat => cat.slug !== 'artificial-jewellery').map(cat => {
                        const categoryIcons = {
                          'handicrafts': '🏺',
                          'pooja': '🪔'
                        };
                        const categoryColors = {
                          'handicrafts': { bg: 'from-orange-500 to-amber-600', border: 'border-orange-400', hover: 'hover:border-orange-400 hover:bg-orange-50' },
                          'pooja': { bg: 'from-[#8B1538] to-[#6B0F2A]', border: 'border-[#8B1538]', hover: 'hover:border-[#8B1538] hover:bg-red-50' }
                        };
                        const colors = categoryColors[cat.slug] || categoryColors['pooja'];
                        const isSelected = selectedCategory === cat.slug && !selectedSubcategory;
                        const hasSubSelected = selectedCategory === cat.slug && selectedSubcategory;
                        
                        return (
                          <div key={cat.category_id} className="rounded-lg overflow-hidden">
                            {/* Main Category */}
                            <button
                              onClick={() => { setSelectedCategory(cat.slug); setSelectedSubcategory(null); }}
                              className={`w-full px-4 py-3 border-2 transition-all flex items-center gap-3 rounded-lg ${
                                isSelected
                                  ? `bg-gradient-to-r ${colors.bg} text-white ${colors.border} shadow-lg`
                                  : hasSubSelected
                                  ? `bg-gradient-to-r ${colors.bg}/10 text-gray-800 ${colors.border}`
                                  : `bg-white text-gray-700 border-gray-200 ${colors.hover}`
                              }`}
                              data-testid={`filter-category-${cat.slug}`}
                            >
                              <span className="text-xl">{categoryIcons[cat.slug] || '📦'}</span>
                              <div className="text-left flex-1">
                                <span className="font-semibold block">{cat.name}</span>
                                {cat.subcategories && cat.subcategories.length > 0 && (
                                  <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                                    {cat.subcategories.length} subcategories
                                  </span>
                                )}
                              </div>
                              {(isSelected || hasSubSelected) && (
                                <span className="text-white/80">✓</span>
                              )}
                            </button>
                            
                            {/* Subcategories - Expandable */}
                            {cat.subcategories && cat.subcategories.length > 0 && (selectedCategory === cat.slug) && (
                              <div className="mt-1 ml-4 pl-4 border-l-2 border-[#D4AF37]/30 space-y-1 py-2">
                                {cat.subcategories.map(sub => {
                                  const isSubSelected = selectedSubcategory === sub.slug;
                                  return (
                                    <button
                                      key={sub.category_id}
                                      onClick={() => { setSelectedCategory(cat.slug); setSelectedSubcategory(sub.slug); }}
                                      className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-2 text-sm ${
                                        isSubSelected
                                          ? "bg-[#D4AF37] text-white shadow-md"
                                          : "bg-gray-50 text-gray-600 hover:bg-[#D4AF37]/10 hover:text-[#8B1538]"
                                      }`}
                                      data-testid={`filter-subcategory-${sub.slug}`}
                                    >
                                      <span className="text-xs">{isSubSelected ? '●' : '○'}</span>
                                      <span className="font-medium">{sub.name}</span>
                                      {isSubSelected && <span className="ml-auto">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Quick Clear */}
                    {(selectedCategory || selectedSubcategory) && (
                      <button
                        onClick={() => { setSelectedCategory(""); setSelectedSubcategory(null); }}
                        className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-[#8B1538] transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear Category Filter
                      </button>
                    )}
                  </div>

                  {/* Laddu Gopal Size Filter - Only show for Pooja category */}
                  {(selectedCategory === 'pooja' || !selectedCategory) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-amber-800 flex items-center gap-2">
                          <Ruler className="w-4 h-4" />
                          Laddu Gopal Size
                        </label>
                        <button 
                          onClick={() => setShowSizeGuide(true)}
                          className="text-xs text-amber-600 hover:text-amber-800 underline"
                        >
                          Size Guide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setLadduGopalSize("")}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            ladduGopalSize === "" 
                              ? "bg-amber-500 text-white border-amber-500" 
                              : "bg-white text-amber-700 border-amber-300 hover:border-amber-400"
                          }`}
                        >
                          All
                        </button>
                        {ladduGopalSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setLadduGopalSize(size)}
                            className={`w-10 h-10 text-sm rounded-full border font-semibold transition-all ${
                              ladduGopalSize === size 
                                ? "bg-amber-500 text-white border-amber-500" 
                                : "bg-white text-amber-700 border-amber-300 hover:border-amber-400"
                            }`}
                            data-testid={`filter-laddu-size-${size}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      {ladduGopalSize && (
                        <p className="text-xs text-amber-600 mt-2">
                          Showing dresses for Size {ladduGopalSize} Laddu Gopal
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                    </label>
                    <div className="space-y-3">
                      <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                        className="w-full"
                        data-testid="price-range-min"
                      />
                      <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="w-full"
                        data-testid="price-range-max"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Availability</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.inStock}
                        onChange={(e) => setFilters({...filters, inStock: e.target.checked})}
                        className="w-4 h-4"
                        data-testid="filter-in-stock"
                      />
                      <span className="text-sm">In Stock Only</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Special</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.featured}
                        onChange={(e) => setFilters({...filters, featured: e.target.checked})}
                        className="w-4 h-4"
                        data-testid="filter-featured"
                      />
                      <span className="text-sm">Featured Products</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary text-sm"
                      data-testid="sort-select"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                    </select>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="w-full bg-muted text-muted-foreground py-2 text-sm hover:bg-muted/80 transition-all"
                    data-testid="clear-filters"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </aside>

            <main className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-lg text-muted-foreground" data-testid="product-count">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-24 bg-white border border-border/40" data-testid="no-products">
                  <p className="text-2xl font-heading text-muted-foreground mb-4">No products found</p>
                  <button
                    onClick={clearFilters}
                    className="text-primary hover:text-primary/80 underline"
                  >
                    Clear filters to see all products
                  </button>
                </div>
              ) : (
                <div data-testid="products-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-2xl overflow-hidden rounded-xl"
                      data-testid={`product-card-${product.product_id}`}
                    >
                      <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative bg-white">
                        <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
                        {/* Primary Image - Full visible */}
                        <img
                          src={product.images?.[0] || 'https://placehold.co/600x600?text=No+Image'}
                          alt={product.name}
                          className={`w-full h-full object-contain p-2 transition-all duration-700 ${product.images?.length > 1 ? 'group-hover:opacity-0 group-hover:scale-110' : 'group-hover:scale-105'}`}
                          loading="lazy"
                          decoding="async"
                          style={{ backgroundColor: 'transparent' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/600x600?text=No+Image';
                          }}
                        />
                        {/* Secondary Image on Hover */}
                        {product.images?.length > 1 && (
                          <img
                            src={product.images[1]}
                            alt={`${product.name} - alternate view`}
                            className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100"
                            loading="lazy"
                            decoding="async"
                            style={{ backgroundColor: 'transparent' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addToWishlist(product.product_id);
                          }}
                          className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full z-10 shadow-lg hover:bg-[#D4AF37] hover:text-white"
                          data-testid={`wishlist-${product.product_id}`}
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                        
                        {/* Quick View Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
                      </Link>
                      <div className="p-4 md:p-5">
                        <Link to={`/products/${product.product_id}`}>
                          <h3 className="text-base md:text-lg font-heading font-semibold mb-2 group-hover:text-[#8B1538] transition-colors line-clamp-2 min-h-[2.5rem]">
                            {product.name}
                          </h3>
                        </Link>
                        
                        {/* Color Variants Indicator */}
                        {product.variants?.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            {product.variants.slice(0, 5).map((v, ci) => (
                              <span key={ci} className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: v.color_code || '#ccc' }} title={v.color_name} />
                            ))}
                            {product.variants.length > 5 && <span className="text-xs text-muted-foreground">+{product.variants.length - 5}</span>}
                          </div>
                        )}

                        {/* Price & Stock in one row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-xl md:text-2xl font-bold text-[#8B1538]">₹{product.price?.toLocaleString('en-IN')}</span>
                            {product.mrp && product.mrp > product.price && (
                              <>
                                <span className="text-sm text-muted-foreground line-through">₹{product.mrp?.toLocaleString('en-IN')}</span>
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                  {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                                </span>
                              </>
                            )}
                          </div>
                          {product.laddu_gopal_sizes && product.laddu_gopal_sizes.length > 0 && (
                            <LadduGopalSizeBadge sizes={product.laddu_gopal_sizes} />
                          )}
                        </div>
                        
                        <button
                          onClick={() => addToCart(product.product_id)}
                          disabled={product.stock === 0}
                          className="w-full bg-gradient-to-r from-[#8B1538] to-[#6B0F2A] text-white py-3 text-sm font-semibold hover:from-[#6B0F2A] hover:to-[#8B1538] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-lg"
                          data-testid={`add-cart-${product.product_id}`}
                        >
                          {product.stock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-10 space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {[...Array(totalPages)].map((_, idx) => {
                      const page = idx + 1;
                      // Show first, last, current, and adjacent pages
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-primary text-white'
                                : 'border border-border hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="px-2 self-end">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
              
              {/* Showing X of Y products */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
              </p>
            </main>

            {/* Side Banner */}
            {sideBanner && (
              <aside className="hidden xl:block w-64 flex-shrink-0">
                <div className="sticky top-24">
                  <a 
                    href={sideBanner.link || "#"} 
                    onClick={() => handleBannerClick(sideBanner)}
                    className="block overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                    data-testid="side-banner"
                  >
                    <img 
                      src={getImageUrl(sideBanner)} 
                      alt={sideBanner.title || 'Side banner'} 
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                    {sideBanner.title && (
                      <div className="p-3 bg-primary text-primary-foreground text-center">
                        <p className="font-medium text-sm">{sideBanner.title}</p>
                      </div>
                    )}
                  </a>
                </div>
              </aside>
            )}
          </div>

          {/* Footer Banner */}
          {footerBanner && (
            <div className="mt-12">
              <a 
                href={footerBanner.link || "#"} 
                onClick={() => handleBannerClick(footerBanner)}
                className="block overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                data-testid="footer-banner"
              >
                {/* 6:1 aspect matches admin-recommended 1200x200 category_footer upload */}
                <div className="w-full aspect-[3/1] md:aspect-[6/1] overflow-hidden">
                  <img
                    src={getImageUrl(footerBanner)}
                    alt={footerBanner.title || 'Footer banner'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {footerBanner.title && (
                  <div className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
                    <h3 className="font-heading font-bold text-xl">{footerBanner.title}</h3>
                  </div>
                )}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Laddu Gopal Size Guide Modal */}
      <LadduGopalSizeGuideModal 
        isOpen={showSizeGuide} 
        onClose={() => setShowSizeGuide(false)}
        onSelectSize={(size) => {
          setLadduGopalSize(size);
          setSelectedCategory('pooja');
        }}
      />
    </div>
  );
}
