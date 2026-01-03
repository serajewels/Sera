import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';


export default function NavOverlay({ isOpen, onClose }) {
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const navigate = useNavigate();


  const handleLinkClick = (path) => {
    onClose();
    navigate(path);
  };


  const menuItems = [
    { title: 'My Account', path: '/profile' },
    { title: 'Wishlist', path: '/profile?tab=wishlist' },
    { 
      title: 'Products', 
      path: '/shop',
      isExpandable: true,
      subItems: [
        { name: 'All Products', path: '/shop' }, // Added "All Products" option
        { name: 'Necklace', path: '/shop?category=Necklace' }, 
        { name: 'Earrings', path: '/shop?category=Earrings' },
        { name: 'Bracelets', path: '/shop?category=Bracelets' },
        { name: 'Rings', path: '/shop?category=Rings' },
      ]
    },
    { title: 'Contact Us', path: '/contact' },
    { title: 'FAQ', path: '/faq' }
  ];



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="nav-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.165, 0.84, 0.44, 1] }}
            className="w-full md:w-[500px] h-full bg-[#fff0f3] shadow-2xl p-8 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-12">
              <span className="text-sm font-bold tracking-widest uppercase text-gray-500">Menu</span>
              <button onClick={onClose} className="text-2xl text-gray-800 hover:text-rose-600 transition-colors">
                <FaTimes />
              </button>
            </div>


            <div className="space-y-4">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                >
                  {item.isExpandable ? (
                    <div>
                      <div className="flex">
                        {/* Clickable Products title - takes 80% width */}
                        <button 
                          onClick={() => handleLinkClick(item.path)}
                          className="flex-1 flex items-center p-6 text-left group"
                        >
                          <span className="text-2xl font-serif text-gray-900 group-hover:text-rose-600 transition-colors">{item.title}</span>
                        </button>
                        
                        {/* Dropdown toggle button - takes 20% width */}
                        <button 
                          onClick={() => setIsProductsOpen(!isProductsOpen)}
                          className="px-6 flex items-center justify-center border-l border-gray-100 hover:bg-rose-50 transition-colors"
                        >
                          {isProductsOpen ? <FaChevronUp className="text-rose-500" /> : <FaChevronDown className="text-gray-400" />}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {isProductsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-rose-50 border-t border-rose-100"
                          >
                            {item.subItems.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={() => handleLinkClick(sub.path)}
                                className="block w-full text-left py-3 px-8 text-lg font-serif text-gray-700 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                {sub.name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleLinkClick(item.path)}
                      className="w-full flex justify-between items-center p-6 text-left group"
                    >
                      <span className="text-2xl font-serif text-gray-900 group-hover:text-rose-600 transition-colors">{item.title}</span>
                      <span className="text-gray-300 group-hover:text-rose-400 transition-colors">→</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200 text-center">
               <p className="text-gray-500 text-sm mb-4">Follow us</p>
               <div className="flex justify-center space-x-6 text-gray-400">
                  <a href="https://www.instagram.com/jewelsbysera" className="hover:text-rose-500 transition-colors">Instagram</a>
                  <a href="#" className="hover:text-rose-500 transition-colors">Pinterest</a>
               </div>
            </div>


          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
