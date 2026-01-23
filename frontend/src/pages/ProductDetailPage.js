import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { ShoppingCart, Heart, Minus, Plus, Star, User } from "lucide-react";
import { toast } from "sonner";

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
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    checkAuth();
    fetchRecommendations();
  }, [id]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Product not found");
      navigate("/products");
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}/recommendations`);
      setRecommendations(response.data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  const addToCart = async () => {
    try {
      await axios.post(`${API}/cart/add`, { product_id: id, quantity }, { withCredentials: true });
      toast.success("Added to cart!");
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

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square mb-4 overflow-hidden bg-white border border-border/40">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="product-main-image"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden border-2 transition-all ${
                      selectedImage === index ? "border-primary" : "border-border/40"
                    }`}
                    data-testid={`product-thumb-${index}`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-6">
              <span className="inline-block px-4 py-1 bg-background-paper text-sm font-medium tracking-wider uppercase text-primary mb-4">
                {product.category}
              </span>
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4" data-testid="product-name">{product.name}</h1>
              <p className="text-3xl font-bold text-accent mb-6" data-testid="product-price">₹{product.price}</p>
            </div>

            <div className="mb-8">
              <p className="text-base leading-relaxed text-muted-foreground" data-testid="product-description">{product.description}</p>
            </div>

            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2">Availability</p>
              <p className="text-lg font-medium" data-testid="product-stock">
                {product.stock > 0 ? (
                  <span className="text-green-600">{product.stock} in stock</span>
                ) : (
                  <span className="text-accent">Out of stock</span>
                )}
              </p>
            </div>

            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-3">Quantity</p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-background-paper p-3 hover:bg-primary hover:text-white transition-all"
                  data-testid="decrease-quantity"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-2xl font-semibold w-16 text-center" data-testid="quantity-display">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="bg-background-paper p-3 hover:bg-primary hover:text-white transition-all"
                  data-testid="increase-quantity"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex space-x-4 mb-6">
              <button
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-primary text-primary-foreground py-4 px-8 font-medium tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                data-testid="add-to-cart-button"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
              <button
                onClick={addToWishlist}
                className="bg-background-paper p-4 hover:bg-primary hover:text-white transition-all"
                data-testid="add-to-wishlist-button"
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={buyNow}
              disabled={product.stock === 0}
              className="w-full bg-secondary text-secondary-foreground py-4 px-8 font-medium tracking-wide hover:bg-secondary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="buy-now-button"
            >
              Buy Now
            </button>
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
      </div>
    </div>
  );
}
