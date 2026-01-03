import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { FaBars, FaSearch, FaUser, FaShoppingCart, FaHeart, FaArrowLeft } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TopBanner from './TopBanner';
import NavOverlay from './NavOverlay';
import SearchOverlay from './SearchOverlay';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();
  const navigate = useNavigate();
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
  }, [location]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (isHome) {
      setIsScrolled(latest > 36);
    }
  });

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

  return (
    <>
      <TopBanner />
      <motion.header
        initial={isHome ? { y: -100, opacity: 0 } : { y: 0, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`z-50 transition-colors duration-300 ${navbarClass}`}
      >
        <div className="container mx-auto px-6 py-4 relative">
          <div className="flex justify-between items-center">
            {/* Left: Hamburger + Back Button */}
            <div className="flex items-center space-x-4 z-10 relative">
              <button onClick={() => setIsNavOpen(true)} className="text-2xl focus:outline-none">
                <FaBars />
              </button>
              
              {!isHome && (
                <motion.button
                  onClick={() => navigate(-1)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:flex items-center space-x-2 text-sm font-semibold uppercase tracking-wider hover:text-rose-500 transition-colors"
                >
                  <FaArrowLeft className="text-lg" />
                  <span>Back</span>
                </motion.button>
              )}
            </div>

            <Link 
  to="/" 
  className="absolute left-[calc(50%-54px)] md:left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 md:-translate-y-[calc(54%-8px)] z-20"
>
  <img 
    src="/logo.png" 
    alt="SERA Logo" 
    className="h-[120px] md:h-28 lg:h-32 xl:h-36 w-auto object-contain transition-opacity duration-300 hover:opacity-80" 
  />
</Link>



            {/* Right: Icons */}
            <div className="flex items-center space-x-6 text-xl z-10 relative">
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
        </div>
      </motion.header>

      <NavOverlay isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
