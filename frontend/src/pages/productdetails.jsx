import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaStar, FaHeart, FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa';


const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect fill='%23f3f4f6' width='500' height='500'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='32' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";


const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // review states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const getUserInfo = () => {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse userInfo from localStorage:', error);
      localStorage.removeItem('userInfo');
      return null;
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products/${id}`);
        setProduct(data);

        const ui = getUserInfo();

        // wishlist status
        if (ui) {
          const config = { headers: { Authorization: `Bearer ${ui.token}` } };
          try {
            const wishlistRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/auth/wishlist`,
              config
            );
            const wishlist = wishlistRes.data || [];
            const inWishlist = wishlist.some((item) =>
              typeof item === 'string' ? item === id : item._id === id
            );
            setIsInWishlist(inWishlist);
          } catch (wishlistErr) {
            console.error('Wishlist check failed:', wishlistErr);
          }
        }

        // review eligibility
        if (ui && data._id) {
          checkReviewEligibility(data._id, ui.token);
        }

        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const checkReviewEligibility = async (productId, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}/review-eligibility`,
        config
      );
      setCanReview(data.canReview);
    } catch (err) {
      console.error('Review eligibility check failed:', err);
      setCanReview(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!userRating || userRating < 1) return;

    const ui = getUserInfo();
    if (!ui) {
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    setReviewLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products/${id}/reviews`,
        {
          rating: userRating,
          comment: reviewComment.trim(),
        },
        config
      );

      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products/${id}`);
      setProduct(data);

      setShowReviewForm(false);
      setUserRating(0);
      setReviewComment('');
      setCanReview(false);
      alert('Review submitted successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit review';
      alert(errorMsg);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAddToCart = async (productToAdd = null) => {
    if (productToAdd && productToAdd.preventDefault) {
      productToAdd = null;
    }

    const ui = getUserInfo();
    const itemToAdd = productToAdd || product;

    if (!ui) {
      navigate(`/login?redirect=/product/${itemToAdd._id}`);
      return;
    }

    if (!productToAdd) {
      setAddingToCart(true);
    }

    try {
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/cart`,
        { productId: itemToAdd._id, quantity: productToAdd ? 1 : quantity },
        config
      );
      alert(`${itemToAdd.name} added to cart!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      if (!productToAdd) {
        setAddingToCart(false);
      }
    }
  };

  const handleWishlist = async () => {
    const ui = getUserInfo();
    if (!ui) {
      navigate('/login');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };

      if (isInWishlist) {
        await axios.delete(
          `${import.meta.env.VITE_API_URL}/api/auth/wishlist/${id}`,
          config
        );
        setIsInWishlist(false);
        alert('Removed from wishlist');
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/wishlist`,
          { productId: id },
          config
        );
        setIsInWishlist(true);
        alert('Added to wishlist');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update wishlist');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading product details...</div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-xl">
        {error}
      </div>
    );

  if (!product) return null;

  return (
    <div className="container mx-auto px-6 py-24">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Image Gallery */}
        <div className="w-full lg:w-1/2">
          <div className="mb-6 aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-lg">
            <motion.img
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={product.images?.[selectedImage] || FALLBACK_IMAGE}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all ${
                    selectedImage === idx
                      ? 'border-rose-500 shadow-md ring-2 ring-rose-200'
                      : 'border-gray-200 hover:border-rose-300'
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover hover:opacity-90"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-500 text-sm font-medium tracking-widest uppercase mb-2">
                {product.category}
              </p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 leading-tight">
                {product.name}
              </h1>
            </div>
            <button
              onClick={handleWishlist}
              className="p-3 rounded-full bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-110 text-2xl hover:bg-rose-50"
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <FaHeart
                className={
                  isInWishlist ? 'text-rose-500 fill-rose-500' : 'text-gray-400'
                }
              />
            </button>
          </div>

          {/* Price & Rating */}
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-4xl font-serif font-light text-gray-900">
                INR {product.price?.toLocaleString()}
              </p>
              {product.stock === 0 && (
                <span className="ml-4 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                  Out of Stock
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="flex text-yellow-400 -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={`text-lg ${
                      i < Math.floor(product.rating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : i === Math.floor(product.rating || 0) &&
                          (product.rating || 0) % 1 >= 0.5
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {product.rating ? product.rating.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-gray-400">
                ({product.numReviews || 0})
              </span>
            </div>
          </div>

          {product.description && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-serif text-xl font-medium mb-4 text-gray-900">
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center border-2 border-gray-200 rounded-lg p-2 w-32">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={product.stock === 0}
                >
                  <FaMinus size={14} />
                </button>
                <span className="w-12 text-center text-lg font-semibold px-4">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock || 999, quantity + 1))
                  }
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={product.stock === 0}
                >
                  <FaPlus size={14} />
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {product.stock === 0
                  ? 'Out of stock'
                  : `${product.stock} in stock`}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-4 px-8 rounded-xl uppercase tracking-wider font-semibold text-lg shadow-lg hover:shadow-xl hover:from-rose-600 hover:to-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
            >
              {addingToCart ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding to cart...
                </>
              ) : (
                <>
                  <FaShoppingCart />
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </>
              )}
            </button>
          </div>

          {/* Accent Pairs Section */}
          {product.accentPairs && product.accentPairs.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h3 className="font-serif text-2xl font-medium mb-6 text-gray-900">
                Complete the Look
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {product.accentPairs.map((pair) => (
                  <div 
                    key={pair._id} 
                    className="group cursor-pointer border rounded-xl p-3 hover:shadow-md transition-all"
                    onClick={() => navigate(`/product/${pair._id}`)}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img 
                        src={pair.images?.[0] || FALLBACK_IMAGE} 
                        alt={pair.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => e.currentTarget.src = FALLBACK_IMAGE}
                      />
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">{pair.name}</h4>
                    <p className="text-sm text-rose-500 font-medium mt-1">
                      INR {pair.price?.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== REVIEWS SECTION - INTEGRATED ========== */}

          {/* Display all reviews (public) */}
          {product.reviews && product.reviews.length > 0 && (
            <div className="border-t pt-8">
              <h3 className="font-serif text-2xl font-medium mb-6 text-gray-900">
                Customer Reviews ({product.numReviews || 0})
              </h3>

              <div className="space-y-6 mb-8">
                {product.reviews.map((review, idx) => (
                  <div key={idx} className="bg-gray-50 p-6 rounded-xl border-l-4 border-rose-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            size={16}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-gray-900">{review.rating}</span>
                      <span className="text-sm text-gray-500">by {review.user?.name || 'Anonymous'}</span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Form - Only for eligible users */}
          {getUserInfo() && canReview && (
            <div className="border-t pt-8">
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="w-full border-2 border-dashed border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-2xl text-center hover:border-rose-300 hover:shadow-md transition-all duration-300 font-serif text-xl font-medium text-rose-700 mb-6"
              >
                ✨ {showReviewForm ? 'Cancel Review' : 'Write Your Review'} ✨
              </button>

              {showReviewForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmitReview}
                  className="bg-white border border-rose-100 rounded-2xl p-8 shadow-lg space-y-6"
                >
                  {/* Star Rating */}
                  <div>
                    <label className="block font-serif text-lg font-medium text-gray-800 mb-4">
                      Your Rating
                    </label>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.div
                          key={star}
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FaStar
                            className={`cursor-pointer text-3xl transition-all duration-200 ${
                              star <= userRating
                                ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg'
                                : 'text-gray-300 hover:text-yellow-400 hover:fill-yellow-400 hover:drop-shadow-md'
                            }`}
                            onClick={() => setUserRating(star)}
                          />
                        </motion.div>
                      ))}
                    </div>
                    {!userRating && (
                      <p className="text-center text-gray-500 text-sm mt-2 font-medium">
                        ⭐ Click a star to rate (1–5)
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block font-serif text-lg font-medium text-gray-800 mb-3">
                      Share Your Experience (Optional)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={5}
                      maxLength={1000}
                      className="w-full p-5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 resize-vertical font-serif text-lg placeholder-gray-400 transition-all"
                      placeholder="Tell us about your experience with this beautiful piece..."
                    />
                    <div className="flex justify-between items-center text-xs mt-2 text-gray-500">
                      <span>{reviewComment.length}/1000 characters</span>
                      <span className={reviewComment.length > 900 ? 'text-rose-500 font-medium' : ''}>
                        {reviewComment.length > 900 ? 'Shorten review' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={reviewLoading || userRating === 0}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-5 px-8 rounded-2xl uppercase tracking-wider font-semibold text-xl shadow-xl hover:shadow-2xl hover:from-rose-600 hover:to-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-3 font-serif"
                  >
                    {reviewLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Publishing your review...
                      </>
                    ) : (
                      <>
                        <FaStar className="text-yellow-300" />
                        Submit Review
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </div>
          )}

          {/* Non-eligible users message */}
          {getUserInfo() && !canReview && (
            <div className="border-t pt-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border-2 border-dashed border-rose-200"
              >
                <div className="text-4xl mb-4">💝</div>
                <h3 className="font-serif text-xl font-semibold text-gray-800 mb-2">
                  Verified Purchase Required
                </h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Share your review after your order is delivered. 
                  <br />
                  {product.numReviews || 0} reviews already shared ✨
                </p>
              </motion.div>
            </div>
          )}

          {/* ========== END REVIEWS SECTION ========== */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm text-gray-500">
            <div className="flex flex-col">
              <span className="font-medium text-gray-700">Product ID:</span>
              <code className="font-mono bg-gray-100 px-2 py-1 rounded text-xs mt-1">
                {product._id?.substring(0, 11)}
              </code>
            </div>
            <div>
              <span>Category: </span>
              <span className="font-medium capitalize">{product.category}</span>
            </div>
            <div>
              <span>Availability: </span>
              <span
                className={
                  product.stock > 5
                    ? 'text-green-600 font-medium'
                    : product.stock > 0
                    ? 'text-yellow-600 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {product.stock > 5
                  ? 'In Stock'
                  : product.stock > 0
                  ? `${product.stock} left`
                  : 'Out of Stock'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;