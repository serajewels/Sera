import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilter, FaSearch, FaShoppingCart, FaHeart } from 'react-icons/fa';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]); // ✅ Always array
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(10000);
  const location = useLocation();
  const navigate = useNavigate();

  const categories = ['All', 'Necklace', 'Earrings', 'Bracelet', 'Rings'];

  // ✅ SAFE PRODUCTS FETCH
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/products');
      // ✅ Handle ALL API response formats
      const safeProducts = Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : [];
      setProducts(safeProducts);
      setFilteredProducts(safeProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✅ URL PARAMS HANDLING
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      const formattedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).toLowerCase();
      setSelectedCategory(formattedCategory);
    } else {
      setSelectedCategory('All');
    }
  }, [location]);

  // ✅ SAFE FILTERING (FIXES LINE 149 filteredProducts.map CRASH)
  useEffect(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    
    let result = safeProducts;

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(p => 
        p.category && 
        p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search Filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name && p.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Price Filter
    result = result.filter(p => 
      p.price && typeof p.price === 'number' && p.price <= priceRange
    );

    setFilteredProducts(result);
  }, [products, selectedCategory, searchQuery, priceRange]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === 'All') {
      navigate('/shop');
    } else {
      navigate(`/shop?category=${category.toLowerCase()}`);
    }
  };

  const addToCart = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) {
      navigate('/login?redirect=/shop');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      await axios.post('http://localhost:5000/api/cart', { productId, quantity: 1 }, config);
      // Optional: Show success toast
      alert('Added to cart!');
    } catch (error) {
      console.error('Add to cart error:', error);
      alert('Failed to add to cart');
    }
  };

  // ✅ SAFE RENDERING - LINE 149 FIXED
  const renderProducts = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg overflow-hidden shadow-sm h-80">
                <div className="h-64 bg-gray-300"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-20 col-span-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="text-6xl text-gray-300 mb-4">🔍</div>
            <h2 className="text-2xl font-serif font-bold text-gray-600 mb-2">
              No products found
            </h2>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or category filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                navigate('/shop');
              }}
              className="bg-rose-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-rose-600 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        </div>
      );
    }

    // ✅ SAFE MAP - NEVER CRASHES
    return filteredProducts.map(product => (
      <Link 
        to={`/product/${product._id}`} 
        key={product._id || Math.random()} 
        className="group"
        prefetch={false}
      >
        <motion.div
          whileHover={{ y: -8 }}
          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            <img 
              src={product.images?.[0] || 'https://via.placeholder.com/300?text=No+Image'} 
              alt={product.name || 'Product'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300?text=No+Image';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            
            {/* Quick Add Button */}
            <button 
              onClick={(e) => addToCart(e, product._id)}
              className="absolute bottom-4 right-4 bg-white text-gray-900 p-3 rounded-full shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-rose-500 hover:text-white hover:shadow-xl"
              title="Add to Cart"
            >
              <FaShoppingCart className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 text-center">
            <h3 className="font-serif text-lg text-gray-900 group-hover:text-rose-500 transition-colors mb-1 truncate">
              {product.name || 'Unnamed Product'}
            </h3>
            <p className="text-gray-500 text-sm mb-2 capitalize truncate">
              {product.category || 'Uncategorized'}
            </p>
            <p className="text-xl font-medium text-gray-900">
              Rs. {product.price?.toLocaleString() || 0}
            </p>
          </div>
        </motion.div>
      </Link>
    ));
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header */}
      <div className="bg-rose-50 py-16 px-6 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-serif text-gray-900 mb-4"
        >
          {selectedCategory === 'All' ? 'Our Collection' : `${selectedCategory} Collection`}
        </motion.h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover our handcrafted jewelry designed to elevate your everyday style.
        </p>
      </div>

      <div className="container mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        {/* Sidebar / Filters */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-1/4 space-y-8 sticky top-8 self-start"
        >
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-serif font-bold mb-6 flex items-center gap-2">
              <FaFilter className="text-rose-500" /> Categories
            </h3>
            <ul className="space-y-3">
              {categories.map(cat => (
                <li key={cat}>
                  <button 
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full text-left py-2 px-4 rounded-lg transition-colors text-lg font-medium ${
                      selectedCategory === cat 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-rose-50 hover:text-rose-500'
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-serif font-bold mb-6 flex items-center gap-2">
              <FaSearch className="text-rose-500" /> Search
            </h3>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-lg"
            />
          </div>
        </motion.div>

        {/* Product Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full lg:w-3/4"
        >
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {renderProducts()}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Shop;
