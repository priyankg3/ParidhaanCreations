import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Search, SlidersHorizontal, Heart, X } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const categoryBanners = {
  handicrafts: {
    image: "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?w=1400&h=300&fit=crop",
    title: "Handcrafted Treasures",
    description: "Authentic Indian handicrafts by skilled artisans"
  },
  pooja: {
    image: "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg?w=1400&h=300&fit=crop",
    title: "Sacred Pooja Collection",
    description: "Essential items for worship and spiritual practices"
  },
  perfumes: {
    image: "https://images.unsplash.com/photo-1768025719875-48ed072f3084?w=1400&h=300&fit=crop",
    title: "Luxury Fragrances",
    description: "Exquisite perfumes and traditional attars"
  },
  jewellery: {
    image: "https://images.unsplash.com/photo-1738754712726-d126c15e206b?w=1400&h=300&fit=crop",
    title: "Traditional Jewellery",
    description: "Elegant artificial jewellery for every occasion"
  }
};

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sortBy, setSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    inStock: false,
    featured: false,
    minPrice: 0,
    maxPrice: 10000
  });

  const categories = ["handicrafts", "pooja", "perfumes", "jewellery"];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, selectedCategory, priceRange, sortBy, filters]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
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
  };

  const filterAndSortProducts = () => {
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

    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured);
    }

    filtered.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "popular") return (b.stock < a.stock) ? 1 : -1;
      return 0;
    });

    setFilteredProducts(filtered);
  };

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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setPriceRange([0, maxPrice]);
    setFilters({
      inStock: false,
      featured: false,
      minPrice: 0,
      maxPrice: maxPrice
    });
    setSortBy("name");
  };

  const categoryBanner = selectedCategory ? categoryBanners[selectedCategory] : null;

  return (
    <div className="min-h-screen">
      {categoryBanner && (
        <div className="relative h-80 overflow-hidden" data-testid={`category-banner-${selectedCategory}`}>
          <img src={categoryBanner.image} alt={categoryBanner.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-primary/90 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl md:text-6xl font-heading font-bold mb-4">{categoryBanner.title}</h1>
              <p className="text-xl">{categoryBanner.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!categoryBanner && (
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
                          <span className="text-sm capitalize">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

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
                      <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {product.featured && (
                          <span className="absolute top-4 left-4 bg-accent text-white text-xs px-3 py-1 font-medium">
                            FEATURED
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span className="absolute top-4 right-4 bg-muted text-muted-foreground text-xs px-3 py-1 font-medium">
                            OUT OF STOCK
                          </span>
                        )}
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
                      <div className="p-6">
                        <Link to={`/products/${product.product_id}`}>
                          <h3 className="text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-2xl font-bold text-accent">₹{product.price}</p>
                          <p className="text-sm text-muted-foreground">{product.stock} in stock</p>
                        </div>
                        <button
                          onClick={() => addToCart(product.product_id)}
                          disabled={product.stock === 0}
                          className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>
    </div>
  );
}
