import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Search, SlidersHorizontal, Heart, X, Ruler } from "lucide-react";
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
  },
  "artificial-jewellery": {
    image: "https://images.unsplash.com/photo-1738754712726-d126c15e206b?w=1400&h=300&fit=crop&q=60&fm=webp",
    title: "Artificial Jewellery",
    description: "Elegant artificial and traditional jewellery for every occasion"
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

  const categories = ["handicrafts", "pooja", "artificial-jewellery"];
  const ladduGopalSizes = ["0", "1", "2", "3", "4", "5", "6", "6+"];

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

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
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
  }, [products, searchTerm, selectedCategory, priceRange, sortBy, filters, ladduGopalSize]);

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
    pooja: "pooja thali, laddu gopal dress, brass diya, incense holder, pooja samagri",
    "artificial-jewellery": "kundan necklace, artificial jewellery, bridal jewellery, traditional bangles, imitation jewellery"
  };

  const seoTitle = selectedCategory 
    ? `${categoryBanners[selectedCategory]?.title || selectedCategory} - Buy Online at Paridhaan Creations`
    : "Shop All Products - Handicrafts, Pooja Items & Artificial Jewellery | Paridhaan Creations";
  
  const seoDescription = selectedCategory
    ? `Buy authentic ${categoryBanners[selectedCategory]?.title || selectedCategory} online at Paridhaan Creations. ${categoryBanners[selectedCategory]?.description || ''}. Free shipping on orders above ₹999. COD available.`
    : "Browse our complete collection of traditional Indian handicrafts, brass pooja articles, and artificial jewellery. Handcrafted by skilled artisans.";

  const seoKeywords = selectedCategory 
    ? categoryKeywords[selectedCategory] || `${selectedCategory}, paridhaan creations`
    : "indian handicrafts, pooja items, artificial jewellery, traditional items, paridhaan creations";

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
        <div className="relative h-64 md:h-80 overflow-hidden" data-testid={`header-banner-${selectedCategory}`}>
          {headerBanner.link ? (
            <a href={headerBanner.link} onClick={() => handleBannerClick(headerBanner)} className="block w-full h-full">
              <img src={getImageUrl(headerBanner)} alt={headerBanner.title || 'Category banner'} className="w-full h-full object-cover" loading="lazy" />
            </a>
          ) : (
            <img src={getImageUrl(headerBanner)} alt={headerBanner.title || 'Category banner'} className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-primary/90 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4">{headerBanner.title || categoryBanner?.title || 'Products'}</h1>
              {headerBanner.cta_text && (
                <p className="text-lg md:text-xl">{headerBanner.cta_text}</p>
              )}
            </div>
          </div>
        </div>
      ) : categoryBanner && (
        <div className="relative h-64 md:h-80 overflow-hidden" data-testid={`category-banner-${selectedCategory}`}>
          <img src={categoryBanner.image} alt={categoryBanner.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-primary/90 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4">{categoryBanner.title}</h1>
              <p className="text-lg md:text-xl">{categoryBanner.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!categoryBanner && !headerBanner && (
            <div className="mb-12">
              <h1 className="text-5xl font-heading font-bold mb-6" data-testid="products-title">Our Products</h1>
            </div>
          )}

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

                  <div>
                    <label className="block text-sm font-medium mb-3">Category</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === ""}
                          onChange={() => setSelectedCategory("")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">All Categories</span>
                      </label>
                      {categories.map(cat => (
                        <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="category"
                            checked={selectedCategory === cat}
                            onChange={() => setSelectedCategory(cat)}
                            className="w-4 h-4"
                            data-testid={`filter-category-${cat}`}
                          />
                          <span className="text-sm capitalize">{cat.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden"
                      data-testid={`product-card-${product.product_id}`}
                    >
                      <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative bg-gray-50 flex items-center justify-center">
                        <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
                        <img
                          src={optimizeImageUrl(product.images[0], 300, 300)}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          width="300"
                          height="300"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addToWishlist(product.product_id);
                          }}
                          className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          data-testid={`wishlist-${product.product_id}`}
                        >
                          <Heart className="w-5 h-5 hover:text-accent" />
                        </button>
                      </Link>
                      <div className="p-5">
                        <Link to={`/products/${product.product_id}`}>
                          <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                        
                        {/* Price */}
                        <p className="text-2xl font-bold text-accent mb-2">₹{product.price}</p>
                        
                        {/* Stock & Size Info */}
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">{product.stock} in stock</p>
                          {product.laddu_gopal_sizes && product.laddu_gopal_sizes.length > 0 && (
                            <LadduGopalSizeBadge sizes={product.laddu_gopal_sizes} />
                          )}
                        </div>
                        
                        <button
                          onClick={() => addToCart(product.product_id)}
                          disabled={product.stock === 0}
                          className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                          data-testid={`add-cart-${product.product_id}`}
                        >
                          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <img 
                  src={getImageUrl(footerBanner)} 
                  alt={footerBanner.title || 'Footer banner'} 
                  className="w-full h-48 md:h-64 object-cover"
                  loading="lazy"
                />
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
