import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Trash2, ShoppingBag, Heart } from "lucide-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState({ product_ids: [] });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await axios.get(`${API}/wishlist`, { withCredentials: true });
      setWishlist(response.data);

      if (response.data.product_ids && response.data.product_ids.length > 0) {
        const productPromises = response.data.product_ids.map(id =>
          axios.get(`${API}/products/${id}`)
        );
        const productResponses = await Promise.all(productPromises);
        setProducts(productResponses.map(res => res.data));
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await axios.delete(`${API}/wishlist/remove/${productId}`, { withCredentials: true });
      toast.success("Removed from wishlist");
      fetchWishlist();
    } catch (error) {
      toast.error("Failed to remove item");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <Heart className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
          <h2 className="text-3xl font-heading font-bold mb-4" data-testid="empty-wishlist-title">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-8">Start adding products you love</p>
          <Link
            to="/products"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all"
            data-testid="browse-products-link"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="wishlist-title">My Wishlist</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <div
              key={product.product_id}
              className="group bg-white border border-border/40 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl overflow-hidden"
              data-testid={`wishlist-item-${product.product_id}`}
            >
              <Link to={`/products/${product.product_id}`} className="block aspect-square overflow-hidden relative">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWishlist(product.product_id);
                  }}
                  className="absolute top-4 right-4 bg-accent text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  data-testid={`remove-${product.product_id}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
                  className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-all duration-300"
                  data-testid={`add-cart-${product.product_id}`}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
