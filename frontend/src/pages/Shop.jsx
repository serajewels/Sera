import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilter, FaSearch, FaShoppingCart, FaTimes, FaCheck, FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';


// Custom Hook: Synchronize URL params with state (prevents race conditions)
const useURLSync = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getURLParams = useCallback(() => {
    const params = new URLSearchParams(location.search);
    return {
      category: params.get('category') ? 
        params.get('category').charAt(0).toUpperCase() + params.get('category').slice(1).toLowerCase() 
        : 'All',
      page: Math.max(1, parseInt(params.get('page') || '1', 10)),
      tags: params.get('tags') ? params.get('tags').split(',').map(t => t.trim()) : [],
    };
  }, [location.search]);


  const updateURLParams = useCallback((newParams) => {
    const params = new URLSearchParams();
    if (newParams.page && newParams.page > 1) params.set('page', newParams.page);
    if (newParams.category && newParams.category !== 'All') {
      params.set('category', newParams.category.toLowerCase());
    }
    if (newParams.tags && newParams.tags.length > 0) {
      params.set('tags', newParams.tags.join(','));
    }
    navigate(`/shop${params.toString() ? '?' + params.toString() : ''}`);
  }, [navigate]);


  return { getURLParams, updateURLParams, location };
};


const Shop = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;


  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(10000);
  const [showInStock, setShowInStock] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);


  const { getURLParams, updateURLParams } = useURLSync();
  const navigate = useNavigate();
  const categories = ['All', 'Necklace', 'Earrings', 'Bracelet', 'Rings'];
  
  // Use refs to prevent race conditions
  const abortControllerRef = useRef(null);
  const lastFetchParamsRef = useRef(null);


  // Memoized fetch params to prevent unnecessary refetches
  const fetchParams = useMemo(() => ({
    currentPage,
    selectedCategory,
    selectedTags,
    searchQuery,
    priceRange,
    showInStock,
    sortBy,
  }), [currentPage, selectedCategory, selectedTags, searchQuery, priceRange, showInStock, sortBy]);


  // OPTIMIZED: Fetch products with proper async handling
  const fetchProducts = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();


    setLoading(true);
    try {
      const paramKey = JSON.stringify(fetchParams);
      lastFetchParamsRef.current = paramKey;


      if (selectedTags.includes('bestseller')) {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/products/bestsellers`,
          { signal: abortControllerRef.current.signal }
        );


        if (lastFetchParamsRef.current === paramKey) {
          const safeProducts = Array.isArray(data.products) ? data.products : [];
          setProducts(safeProducts);
          setTotalPages(1);
          setTotalProducts(safeProducts.length);
        }
      } else {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('limit', ITEMS_PER_PAGE);


        if (selectedCategory !== 'All') {
          params.set('category', selectedCategory.toLowerCase());
        }
        if (searchQuery.trim()) {
          params.set('keyword', searchQuery);
        }
        if (priceRange < 10000) {
          params.set('maxPrice', priceRange);
        }
        if (showInStock) {
          params.set('inStock', 'true');
        }
        if (sortBy !== 'relevance') {
          params.set('sort', sortBy);
        }


        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/products?${params.toString()}`,
          { signal: abortControllerRef.current.signal }
        );


        // Only update state if this is still the latest request
        if (lastFetchParamsRef.current === paramKey) {
          const safeProducts = Array.isArray(data.products) ? data.products : [];
          setProducts(safeProducts);
          setTotalPages(data.pages || 1);
          setTotalProducts(data.total || 0);
        }
      }
    } catch (error) {
      // FIXED: Properly ignore AbortError/CanceledError
      if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        // Request was cancelled, don't show error
        return;
      }
      
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalPages(0);
      setTotalProducts(0);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, searchQuery, priceRange, showInStock, selectedTags, sortBy, fetchParams]);


  // Fetch when filter dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchParams]);


  // Handle URL synchronization on mount and location change
  useEffect(() => {
    const urlParams = getURLParams();
    
    // Only update state if URL params differ from current state
    if (urlParams.category !== selectedCategory) {
      setSelectedCategory(urlParams.category);
    }
    if (urlParams.page !== currentPage) {
      setCurrentPage(urlParams.page);
    }
    if (JSON.stringify(urlParams.tags) !== JSON.stringify(selectedTags)) {
      setSelectedTags(urlParams.tags);
    }
  }, [getURLParams]);


  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setShowFilters(false);
    updateURLParams({ category, page: 1, tags: selectedTags });
  };


  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      updateURLParams({ category: selectedCategory, page: newPage, tags: selectedTags });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  const handleBestsellersToggle = () => {
    const newTags = selectedTags.includes('bestseller')
      ? selectedTags.filter(t => t !== 'bestseller')
      : [...selectedTags, 'bestseller'];
    setSelectedTags(newTags);
    setCurrentPage(1);
    updateURLParams({ category: selectedCategory, page: 1, tags: newTags });
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


    if (products.length === 0) {
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
                setSelectedTags([]);
                setSortBy('relevance');
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


    return products.map(product => (
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
              loading="lazy"
              decoding="async"
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
            <p className="text-lg md:text-xl font-medium text-gray-900">
              INR {product.price?.toLocaleString() || 0}
            </p>
          </div>
        </motion.div>
      </Link>
    ));
  };


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
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>


        {pageNumbers.map((num, idx) => (
          <button
            key={idx}
            onClick={() => typeof num === 'number' && handlePageChange(num)}
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
          onClick={() => handlePageChange(currentPage + 1)}
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
          {selectedTags.includes('bestseller') ? '⭐ Bestsellers' : selectedCategory === 'All' ? 'Our Collection' : `${selectedCategory} Collection`}
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
                          disabled={selectedTags.includes('bestseller')}
                          className={`w-full text-left py-2 px-3 md:px-4 rounded-lg transition-colors text-sm md:text-base font-medium ${
                            selectedCategory === cat
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'text-gray-600 hover:bg-rose-50 hover:text-rose-500'
                          } ${selectedTags.includes('bestseller') ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        onChange={(e) => {
                          setShowInStock(e.target.checked);
                          setCurrentPage(1);
                        }}
                        disabled={selectedTags.includes('bestseller')}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500 ${selectedTags.includes('bestseller') ? 'opacity-50' : ''}`}></div>
                    </div>
                    <span className={`text-gray-700 font-medium group-hover:text-rose-600 transition-colors ${selectedTags.includes('bestseller') ? 'opacity-50' : ''}`}>
                      In Stock Only
                    </span>
                  </label>
                </div>


                {/* Bestseller Toggle */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
                  <h3 className="text-base md:text-lg font-serif font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <FaStar className="text-rose-500" /> Bestsellers
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes('bestseller')}
                        onChange={handleBestsellersToggle}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-rose-600 transition-colors">
                      Show Bestsellers Only
                    </span>
                  </label>
                </div>


                {/* Sort By Dropdown */}
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
                  <h3 className="text-base md:text-lg font-serif font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <FaFilter className="text-rose-500" /> Sort By
                  </h3>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={selectedTags.includes('bestseller')}
                    className="w-full border border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm md:text-base bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="best-selling">Best Selling</option>
                  </select>
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={selectedTags.includes('bestseller')}
                    className="w-full border border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
                {selectedTags.includes('bestseller')
                  ? `Showing ${products.length} top-selling products`
                  : `Showing ${products.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0}–${Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} of ${totalProducts} products`
                }
              </div>
            </div>


            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {renderProducts()}
            </div>


            {!selectedTags.includes('bestseller') && renderPagination()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};


export default Shop;