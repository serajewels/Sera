import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { FaBars, FaSearch, FaUser, FaShoppingCart, FaHeart } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import TopBanner from './TopBanner';
import NavOverlay from './NavOverlay';
import SearchOverlay from './SearchOverlay';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      try {
        setUserInfo(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse userInfo from localStorage:', error);
        localStorage.removeItem('userInfo');
        setUserInfo(null);
      }
    }
  }, [location]); // Re-check on route change (e.g. after login redirect)

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (isHome) {
      setIsScrolled(latest > 36);
    }
  });

  // Force white navbar on non-home pages
  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
    } else {
      setIsScrolled(scrollY.get() > 36);
    }
  }, [isHome, scrollY]);

  const navbarClass = isHome
    ? (isScrolled 
        ? 'fixed top-0 left-0 right-0 bg-white shadow-sm text-gray-900' 
        : 'absolute top-[36px] left-0 right-0 bg-transparent text-white')
    : 'sticky top-0 left-0 right-0 bg-white shadow-sm text-gray-900'; 
    // On non-home pages, we can use sticky or fixed. 
    // If sticky, it takes space. But TopBanner is relative.
    // If TopBanner is present on all pages, sticky works well.
    // But sticky top-0 means it sticks under TopBanner?
    // If TopBanner scrolls, sticky navbar follows until top-0.
    // So 'sticky top-0' is good for non-home.

  return (
    <>
      <TopBanner />
      <motion.header
        initial={isHome ? { y: -100, opacity: 0 } : { y: 0, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`z-50 transition-colors duration-300 ${navbarClass}`}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Left: Hamburger */}
          <button onClick={() => setIsNavOpen(true)} className="text-2xl focus:outline-none">
            <FaBars />
          </button>

          {/* Center: Logo */}
          <Link to="/" className="text-3xl font-serif font-bold tracking-widest uppercase">
            SERA
          </Link>

          {/* Right: Icons */}
          <div className="flex items-center space-x-6 text-xl">
            <Link to="/shop" className="text-sm font-bold uppercase tracking-wider hidden md:block hover:text-rose-500 transition-colors">
              Shop
            </Link>
            {userInfo && userInfo.role === 'admin' && (
              <Link to="/admin" className="text-sm font-bold uppercase tracking-wider border border-current px-2 py-1 rounded hover:opacity-75 transition-opacity">
                Admin
              </Link>
            )}
            <button onClick={() => setIsSearchOpen(true)}><FaSearch /></button>
            <Link to="/profile?tab=wishlist"><FaHeart className="hover:text-rose-500 transition-colors" /></Link>
            <Link to="/profile"><FaUser className="hover:text-rose-500 transition-colors" /></Link>
            <Link to="/cart" className="relative">
                <FaShoppingCart className="hover:text-rose-500 transition-colors" />
            </Link>
          </div>
        </div>
      </motion.header>

      <NavOverlay isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
