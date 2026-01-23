import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ChevronLeft, ChevronRight, ShoppingBag, Heart, Star } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ProductBadge from "@/components/ProductBadge";

const heroImages = [
  "https://images.unsplash.com/photo-1767338718657-9006d701ce6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1738754712726-d126c15e206b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1768025719875-48ed072f3084?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZXJmdW1lJTIwYm90dGxlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2OTE2MzkyNnww&ixlib=rb-4.1.0&q=85"
];

const categories = [
  {
    name: "Handicrafts",
    slug: "handicrafts",
    image: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMGJyYXNzJTIwZGVjb3J8ZW58MHx8fHwxNzY5MTYzOTIyfDA&ixlib=rb-4.1.0&q=85"
  },
  {
    name: "Pooja Articles",
    slug: "pooja",
    image: "https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg"
  },
  {
    name: "Perfumes",
    slug: "perfumes",
    image: "https://images.unsplash.com/photo-1758871992965-836e1fb0f9bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBwZXJmdW1lJTIwYm90dGxlJTIwYWVzdGhldGljfGVufDB8fHx8MTc2OTE2MzkyNnww&ixlib=rb-4.1.0&q=85"
  },
  {
    name: "Jewellery",
    slug: "jewellery",
    image: "https://images.unsplash.com/photo-1738754719555-05aca36707b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBhcnRpZmljaWFsJTIwa3VuZGFuJTIwamV3ZWxsZXJ5fGVufDB8fHx8MTc2OTE2MzkyOHww&ixlib=rb-4.1.0&q=85"
  }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [categoriesData, setCategoriesData] = useState(categories);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchBanners();
    fetchCategories();

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?featured=true`);
      setFeaturedProducts(response.data.slice(0, 4));
    } catch (error) {
      console.error("Error fetching featured products:", error);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error("Error fetching banners:", error);
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

  return (
    <div className="min-h-screen">
      <SEO 
        title="Paridhaan Creations - Traditional Indian Handicrafts & Jewellery"
        description="Discover authentic Indian handicrafts, pooja articles, premium perfumes, and traditional artificial jewellery. Handcrafted treasures by skilled artisans."
        keywords="Indian handicrafts, pooja items, traditional jewellery, perfumes, artificial jewellery, brass handicrafts, pooja thali"
      />
      
      <section className="relative h-[600px] overflow-hidden" data-testid="hero-section">
        {heroImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={img} alt={`Hero ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/80"></div>
          </div>
        ))}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-bold font-heading text-white mb-6 tracking-tight" data-testid="hero-title">
              Paridhaan Creations
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover authentic Indian handicrafts, pooja articles, perfumes, and traditional jewellery
            </p>
            <Link
              to="/products"
              className="inline-block bg-secondary text-secondary-foreground px-8 py-4 font-medium tracking-wide hover:bg-secondary/90 transition-all duration-300 hover:shadow-xl"
              data-testid="shop-now-button"
            >
              Shop Now
            </Link>
          </div>
        </div>

        <button
          onClick={() => setCurrentSlide((currentSlide - 1 + heroImages.length) % heroImages.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-all"
          data-testid="hero-prev-button"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={() => setCurrentSlide((currentSlide + 1) % heroImages.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-all"
          data-testid="hero-next-button"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4" data-testid="categories-title">Shop by Category</h2>
            <p className="text-lg text-muted-foreground">Explore our curated collections</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative overflow-hidden bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl"
                data-testid={`category-${category.slug}`}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex items-end">
                  <h3 className="text-2xl font-heading font-semibold text-white p-6">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="py-24 bg-background-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4" data-testid="featured-title">Featured Products</h2>
              <p className="text-lg text-muted-foreground">Handpicked treasures for you</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <div
                  key={product.product_id}
                  className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden"
                  data-testid={`product-${product.product_id}`}
                >
                  <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative">
                    <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || 'featured'} />
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </Link>
                  <div className="p-6">
                    <Link to={`/products/${product.product_id}`}>
                      <h3 className="text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-2xl font-bold text-accent mb-4">₹{product.price}</p>
                    <button
                      onClick={() => addToCart(product.product_id)}
                      className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-all duration-300 opacity-0 group-hover:opacity-100"
                      data-testid={`add-to-cart-${product.product_id}`}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {banners.length > 0 && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {banners.map((banner) => (
                <div key={banner.banner_id} className="relative overflow-hidden group" data-testid={`banner-${banner.banner_id}`}>
                  <img src={banner.image} alt={banner.title} className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end">
                    <div className="p-6">
                      <h3 className="text-2xl font-heading font-semibold text-white mb-2">{banner.title}</h3>
                      {banner.link && (
                        <a href={banner.link} className="text-secondary hover:text-secondary/90 font-medium">
                          Learn More →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}