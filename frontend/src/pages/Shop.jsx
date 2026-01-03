import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilter, FaSearch, FaShoppingCart, FaTimes, FaCheck, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Shop = () => {
  // ✅ NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12; // Shows 12 products per page

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(10000);
  const [showInStock, setShowInStock] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const categories = ['All', 'Necklace', 'Earrings', 'Bracelet', 'Rings'];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products?limit=1000`);
      const safeProducts = Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : [];
      setProducts(safeProducts);
      setFilteredProducts(safeProducts);
      setCurrentPage(1); // ✅ Reset to page 1 when products change
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const tagsParam = params.get('tags');

    if (categoryParam) {
      const formattedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).toLowerCase();
      setSelectedCategory(formattedCategory);
    } else {
      setSelectedCategory('All');
    }

    if (tagsParam) {
      setSelectedTags(tagsParam.split(',').map(t => t.trim()));
    } else {
      setSelectedTags([]);
    }
    
    setCurrentPage(1); // ✅ Reset pagination when filters change
  }, [location]);

  // ✅ OPTIMIZED: Use useMemo to prevent unnecessary filter recalculation
  const filteredAndPaginatedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let result = safeProducts;

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(p => 
        p.category && 
        p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Stock Status
    if (showInStock) {
      result = result.filter(p => p.stock > 0);
    }

    // Filter by Tags
    if (selectedTags.length > 0) {
      const hasBestseller = selectedTags.includes('bestseller');
      
      if (hasBestseller) {
        const otherTags = selectedTags.filter(t => t !== 'bestseller');
        
        if (otherTags.length > 0) {
          result = result.filter(p => 
            p.tags && otherTags.every(t => p.tags.includes(t))
          );
        }
        
        if (selectedCategory === 'All') {
          const grouped = {};
          result.forEach(p => {
            const cat = p.category || 'Uncategorized';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
          });
          
          const bestsellers = [];
          Object.keys(grouped).forEach(cat => {
            const sorted = grouped[cat].sort((a, b) => {
              const salesA = a.sales || 0;
              const salesB = b.sales || 0;
              if (salesB !== salesA) return salesB - salesA;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            bestsellers.push(...sorted.slice(0, 3));
          });
          result = bestsellers;
        } else {
          result.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        }
      } else {
        result = result.filter(p => 
          p.tags && selectedTags.every(t => p.tags.includes(t))
        );
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name && p.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by Price Range
    result = result.filter(p => 
      p.price && typeof p.price === 'number' && p.price <= priceRange
    );

    setFilteredProducts(result);
    setCurrentPage(1); // ✅ Reset to page 1 when filters change
    return result;
  }, [products, selectedCategory, searchQuery, priceRange, selectedTags, showInStock]);

  // ✅ NEW: Calculate pagination values
  const totalPages = Math.ceil(filteredAndPaginatedProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredAndPaginatedProducts.slice(startIndex, endIndex);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowFilters(false);
    setCurrentPage(1); // ✅ Reset pagination
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
      await axios.post(`${import.meta.env.VITE_API_URL}/api/cart`, { productId, quantity: 1 }, config);
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add to cart');
    }
  };

  // ✅ OPTIMIZED: Only render paginated products
  const renderProducts = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

    if (paginatedProducts.length === 0 && filteredAndPaginatedProducts.length === 0) {
      return (
        <div className="text-center py-12 md:py-20 col-span-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto px-4"
          >
            <div className="text-4xl md:text-6xl text-gray-300 mb-4">🔍</div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-600 mb-2">
              No products found
            </h2>
            <p className="text-sm md:text-base text-gray-500 mb-6">
              Try adjusting your search or category filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setCurrentPage(1);
                navigate('/shop');
              }}
              className="bg-rose-500 text-white px-6 md:px-8 py-2 md:py-3 rounded-lg font-medium hover:bg-rose-600 transition-colors text-sm md:text-base"
            >
              Clear Filters
            </button>
          </motion.div>
        </div>
      );
    }

    return paginatedProducts.map(product => (
      <Link 
        to={`/product/${product._id}`} 
        key={product._id || Math.random()} 
        className="group"
      >
        <motion.div
          whileHover={{ y: -8 }}
          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            <img 
              src={product.images?.[0] || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 300 300\'%3E%3Crect fill=\'%23f3f4f6\' width=\'300\' height=\'300\'/%3E%3Ctext fill=\'%239ca3af\' font-family=\'sans-serif\' font-size=\'24\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3ENo Image%3C/text%3E%3C/svg%3E'} 
              alt={product.name || 'Product'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy" // ✅ NEW: Lazy load images
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 300 300\'%3E%3Crect fill=\'%23f3f4f6\' width=\'300\' height=\'300\'/%3E%3Ctext fill=\'%239ca3af\' font-family=\'sans-serif\' font-size=\'24\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            
            {product.stock === 0 && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Out of Stock
              </div>
            )}
            
            <button 
              onClick={(e) => addToCart(e, product._id)}
              className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-white text-gray-900 p-2 md:p-3 rounded-full shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-rose-500 hover:text-white hover:shadow-xl"
              title="Add to Cart"
              disabled={product.stock === 0}
            >
              <FaShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          
          <div className="p-3 md:p-4 text-center">
            <h3 className="font-serif text-base md:text-lg text-gray-900 group-hover:text-rose-500 transition-colors mb-1 truncate">
              {product.name || 'Unnamed Product'}
            </h3>
            <p className="text-gray-500 text-xs md:text-sm mb-2 capitalize truncate">
              {product.category || 'Uncategorized'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-lg md:text-xl font-medium text-gray-900">
                INR {product.price?.toLocaleString() || 0}
              </p>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="text-xs text-orange-500 font-medium">
                  Only {product.stock} left
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    ));
  };

  // ✅ NEW: Pagination controls component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(1);
      if (startPage > 2) pageNumbers.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((num, idx) => (
          <button
            key={idx}
            onClick={() => typeof num === 'number' && setCurrentPage(num)}
            disabled={num === '...'}
            className={`
              px-3 py-2 rounded-lg font-medium transition-colors
              ${num === currentPage 
                ? 'bg-rose-500 text-white' 
                : num === '...'
                ? 'cursor-default text-gray-500'
                : 'border border-gray-300 hover:bg-rose-50 hover:border-rose-500'
              }
            `}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* Header */}
      <div className="bg-rose-50 py-8 md:py-16 px-4 md:px-6 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-2 md:mb-4"
        >
          {selectedCategory === 'All' ? 'Our Collection' : `${selectedCategory} Collection`}
        </motion.h1>
        {selectedTags.length > 0 && (
          <p className="text-rose-500 font-medium mb-2 uppercase tracking-wide text-sm">
            Filtered by: {selectedTags.join(', ')}
          </p>
        )}
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
          Discover our handcrafted jewelry designed to elevate your everyday style.
        </p>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-12">
        {/* Mobile Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden fixed bottom-6 right-6 z-40 bg-rose-500 text-white p-4 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
        >
          {showFilters ? <FaTimes className="w-5 h-5" /> : <FaFilter className="w-5 h-5" />}
        </button>

        <div className="flex flex-col lg:flex-row gap-6 md:gap-12">
          {/* Sidebar / Filters */}
          <AnimatePresence>
            {(showFilters || window.innerWidth >= 1024) && (
              <motion.div 
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                className={`
                  fixed lg:static top-0 left-0 h-full lg:h-auto
                  w-72 lg:w-1/4 bg-white lg:bg-transparent
                  z-50 lg:z-auto shadow-2xl lg:shadow-none
                  overflow-y-auto lg:overflow-visible
                  p-6 lg:p-0 space-y-6 md:space-y-8
                  ${showFilters ? 'block' : 'hidden lg:block'}
                `}
              >
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-6 h-6" />
                </button>

                {/* Categories */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border mt-12 lg:mt-0">
                  <h3 className="text-base md:text-lg font-serif font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <FaFilter className="text-rose-500" /> Categories
                  </h3>
                  <ul className="space-y-2 md:space-y-3">
                    {categories.map(cat => (
                      <li key={cat}>
                        <button 
                          onClick={() => handleCategoryClick(cat)}
                          className={`w-full text-left py-2 px-3 md:px-4 rounded-lg transition-colors text-sm md:text-base font-medium ${
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

                {/* Stock Filter */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
                  <h3 className="text-base md:text-lg font-serif font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <FaCheck className="text-rose-500" /> Availability
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={showInStock}
                        onChange={(e) => setShowInStock(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-rose-600 transition-colors">
                      In Stock Only
                    </span>
                  </label>
                </div>

                {/* Search */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
                  <h3 className="text-base md:text-lg font-serif font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <FaSearch className="text-rose-500" /> Search
                  </h3>
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm md:text-base"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay for mobile */}
          {showFilters && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowFilters(false)}
            />
          )}

          {/* Product Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full lg:w-3/4"
          >
            <div className="mb-4 md:mb-8 flex items-center justify-between flex-wrap gap-2 md:gap-4">
              <div className="text-xs md:text-sm text-gray-600">
                {/* ✅ NEW: Updated product count info */}
                Showing {startIndex + 1}–{Math.min(endIndex, filteredAndPaginatedProducts.length)} of {filteredAndPaginatedProducts.length} products 
                {filteredAndPaginatedProducts.length < products.length && ` (filtered from ${products.length})`}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {renderProducts()}
            </div>

            {/* ✅ NEW: Pagination controls */}
            {renderPagination()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
