import { FaInstagram, FaPinterest } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-rose-50 pt-16 pb-8 px-6 md:px-12 text-gray-900 border-t border-rose-200">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Left Section: Brand & Description */}
        <div className="md:col-span-5 space-y-6">
          <h2 className="text-6xl font-serif font-bold text-rose-600 tracking-tight">SERA</h2>
          <div className="space-y-4 text-sm leading-relaxed max-w-md">
            <p className="font-medium">Where elegance meets intention.</p>
            <p>
              SERA is a jewellery brand born from the love of timeless simplicity. 
              Every piece in this collection is designed to celebrate you — your story, 
              your strength, your softness. Crafted with care and a keen eye for detail, 
              our rings, bracelets, necklaces, and earrings are made to blend effortlessly 
              into your everyday, while still standing out with grace.
            </p>
            <p>Let <span className="font-bold">SERA</span> be your everyday luxury.</p>
          </div>
          {/* Social Icons Row */}
          <div className="flex items-center gap-4 pt-4">
            <a href="https://www.instagram.com/jewelsbysera" target="_blank" rel="noopener noreferrer" 
               className="group" aria-label="Instagram">
              <FaInstagram className="w-6 h-6 text-gray-900 group-hover:text-rose-600 transition-colors duration-300 hover:scale-110" />
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" 
               className="group" aria-label="Pinterest">
              <FaPinterest className="w-6 h-6 text-gray-900 group-hover:text-rose-600 transition-colors duration-300 hover:scale-110" />
            </a>
          </div>
        </div>

        {/* Right Section: Links */}
        <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-8 md:pl-12 border-l border-rose-200">
          
          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="font-bold tracking-widest uppercase text-sm text-rose-600">Quick Links</h3>
            <ul className="space-y-4 text-sm font-light">
              <li><Link to="/privacy-policy" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3">PRIVACY POLICY <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
              <li><Link to="/terms" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3">TERMS & CONDITIONS <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
              <li><Link to="/returns" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3">RETURNS & EXCHANGE <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
              <li><Link to="/contact" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3">CONTACT <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
            </ul>
          </div>

          {/* Explore */}
          <div className="space-y-6">
            <h3 className="font-bold tracking-widest uppercase text-sm text-rose-600">Explore</h3>
            <ul className="space-y-4 text-sm font-light">
              <li><Link to="/shop" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3 uppercase">Shop <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
              <li><Link to="/about" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3 uppercase">About Us <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
              <li><Link to="/faq" className="hover:text-rose-600 transition-colors group flex items-center gap-2 hover:gap-3">FAQ's <span className="w-1 h-1 bg-rose-600 rounded-full scale-0 group-hover:scale-100 transition-all duration-300"></span></Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="font-bold tracking-widest uppercase text-sm text-rose-600">Contact</h3>
            <div className="space-y-4 text-sm font-light">
              <h4 className="font-semibold text-rose-600 mb-2 tracking-wide uppercase text-xs">Email</h4>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 mt-1 bg-rose-200 rounded-full flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-rose-600">✉</span>
                </span>
                <a href="mailto:serajewels1@gmail.com" className="hover:text-rose-600 transition-colors break-all">serajewels1@gmail.com</a>
              </p>
              <div>
                <h4 className="font-semibold text-rose-600 mb-2 tracking-wide uppercase text-xs">Instagram</h4>
                <a href="https://instagram.com/serajewelry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-rose-600 transition-colors">
                  <FaInstagram className="w-4 h-4" />
                  <span>Follow us</span>
                </a>
              </div>
              <div>
                <h4 className="font-semibold text-rose-600 mb-2 tracking-wide uppercase text-xs">Pinterest</h4>
                <a href="https://pinterest.com/serajewelry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-rose-600 transition-colors">
                  <FaPinterest className="w-4 h-4" />
                  <span>Follow us</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="container mx-auto mt-16 pt-12 border-t border-rose-200">
        <div className="flex flex-col md:flex-row justify-between items-center text-xs tracking-widest text-gray-600 gap-6 md:gap-0">
          <div className="flex flex-wrap gap-4 md:gap-8">
            <Link to="/privacy-policy" className="hover:text-rose-600 transition-colors uppercase hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-rose-600 transition-colors uppercase hover:underline">Terms of Service</Link>
            <span>© 2025 SERA. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
