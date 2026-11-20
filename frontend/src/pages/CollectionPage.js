import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ProductBadge from "@/components/ProductBadge";

export default function CollectionPage() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/collections/${slug}`);
      setCollection(response.data);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching collection:", error);
      toast.error("Collection not found");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCollection();
    window.scrollTo(0, 0);
  }, [fetchCollection]);

  const addToCart = async (productId) => {
    try {
      await axios.post(`${API}/cart/add`, { product_id: productId, quantity: 1 }, { withCredentials: true });
      toast.success("Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
        <Link to="/" className="text-primary hover:underline">
          Go back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={`${collection.name} - Paridhaan Creations`}
        description={collection.description || `Shop our ${collection.name} collection at Paridhaan Creations`}
        keywords={`${collection.name}, paridhaan creations, ${collection.collection_type}, festival collection`}
      />
      
      {/* Hero Section */}
      <div className="relative h-[200px] md:h-[300px] overflow-hidden">
        <img
          src={collection.image || 'https://placehold.co/1200x400?text=' + encodeURIComponent(collection.name)}
          alt={collection.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/1200x400?text=' + encodeURIComponent(collection.name);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {collection.badge_text && (
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
              style={{ backgroundColor: collection.badge_color || '#ef4444' }}
            >
              {collection.badge_text}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-white mb-2">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-white/80 text-sm md:text-base max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Coming Soon!</h2>
            <p className="text-gray-500">Products are being added to this collection.</p>
            <Link 
              to="/products" 
              className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">{products.length} products in this collection</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <article
                  key={product.product_id}
                  className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden rounded-lg"
                  data-testid={`collection-product-${product.product_id}`}
                >
                  <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative bg-gray-50">
                    <ProductBadge type={product.stock === 0 ? 'out-of-stock' : product.badge || (product.featured ? 'featured' : null)} />
                    <img
                      src={product.images?.[0] || 'https://placehold.co/300x300?text=No+Image'}
                      alt={`${product.name} - ₹${product.price}`}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/300x300?text=No+Image';
                      }}
                    />
                  </Link>
                  <div className="p-3 md:p-4">
                    <Link to={`/products/${product.product_id}`}>
                      <h3 className="text-sm md:text-base font-heading font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-lg md:text-xl font-bold text-primary mb-3">₹{product.price}</p>
                    {product.laddu_gopal_sizes && product.laddu_gopal_sizes.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">
                        Fits Size: {product.laddu_gopal_sizes.join(', ')}
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(product.product_id);
                      }}
                      className="w-full bg-primary text-white py-2 text-sm font-medium hover:bg-primary/90 transition-all duration-300 rounded"
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
