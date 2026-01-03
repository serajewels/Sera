// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/login';
import Register from './pages/register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/profile';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ProductDetails from './pages/productdetails';
import Shop from './pages/Shop';
import OrderSuccess from './pages/OrderSuccess';

// info pages (only About + FAQ from InfoPages.jsx)
import { About, FAQ } from './pages/InfoPages';

// new legal / policy pages (make sure these files exist)
import PrivacyPolicy from './pages/PrivacyPolicy';
import Returns from './pages/Returns';
import TermsPage from './pages/TermsPage';

import Contact from './pages/Contact';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="top-center" />
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* core pages */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/product/:id" element={<ProductDetails />} />

            {/* info pages */}
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />

            {/* legal / policy pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/returns" element={<Returns />} />

            {/* contact */}
            <Route path="/contact" element={<Contact />} />

            {/* optional: 404 fallback
            <Route path="*" element={<NotFound />} />
            */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
