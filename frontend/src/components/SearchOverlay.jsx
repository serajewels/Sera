import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]); // ✅ Always array
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const overlayRef = useRef(null);

  // ✅ SAFE PRODUCTS FETCH
  const fetchProducts = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products`);
      // ✅ Handle ALL response formats
      setProducts(Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products for search:', error);
      setProducts([]); // ✅ Always fallback to array
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  // ✅ FETCH ON OPEN
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✅ DEBOUNCED FILTER (FIXES LINE 30 products.filter CRASH)
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(() => {
      if (query.trim() === '') {
        setFilteredProducts([]);
      } else {
        // ✅ SAFE FILTER - NEVER CRASHES
        const safeProducts = Array.isArray(products) ? products : [];
        const lowerQuery = query.toLowerCase();
        const filtered = safeProducts.filter(p => 
          (p.name?.toLowerCase().includes(lowerQuery) || '') || 
          (p.category?.toLowerCase().includes(lowerQuery) || '')
        );
        setFilteredProducts(filtered);
      }
    }, 300);

    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [query, products]);

  // ✅ OUTSIDE CLICK TO CLOSE
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // ✅ SAFE RESULT RENDERING
  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 text-sm">Searching...</div>
        </div>
      );
    }

    if (query.trim() === '') {
      return (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm mb-2">Search for Necklace, Rings...</p>
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">Try different keywords</p>
        </div>
      );
    }

    return filteredProducts.map(product => (
      <motion.div 
        key={product._id || Math.random()}
        className="flex items-center gap-4 border-b border-gray-100 pb-2 hover:bg-rose-50 p-2 rounded cursor-pointer transition-colors"
        whileHover={{ scale: 1.02 }}
        onClick={() => {
          window.location.href = `/product/${product._id}`;
          onClose();
        }}
      >
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/50?text=?'} 
          alt={product.name || 'Product'}
          className="w-12 h-12 object-cover rounded flex-shrink-0" 
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-lg truncate">{product.name || 'Unnamed Product'}</h4>
          <p className="text-gray-500 text-sm">Rs {product.price || 0}</p>
          <p className="text-xs text-gray-400 capitalize truncate">{product.category || 'N/A'}</p>
        </div>
      </motion.div>
    ));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-24"
          onClick={onClose}
        >
          <div 
            ref={overlayRef}
            className="bg-white p-6 w-full max-w-2xl rounded-lg shadow-lg max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <input 
                type="text" 
                placeholder="Search for Necklace, Rings..." 
                className="w-full border-none p-2 text-xl font-serif focus:outline-none focus:ring-2 focus:ring-rose-500 rounded-lg"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {renderResults()}
            </div>

            {/* Footer */}
            {query.trim().length > 0 && filteredProducts.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">
                  Found {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
