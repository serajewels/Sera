import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage(data.message);
      // Optional: Redirect to reset password page after a delay or immediately
      setTimeout(() => {
        navigate(`/reset-password?email=${email}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 py-12 px-4 sm:px-6 lg:px-8 mt-[36px]">
      <div className="flex w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <h2 className="text-3xl font-serif text-gray-900 text-center mb-2">Forgot Password</h2>
          <p className="text-gray-500 text-center mb-8 font-light">Enter your email to receive a password reset OTP</p>
          
          {message && <div className="bg-green-50 text-green-600 p-3 rounded mb-6 text-sm text-center border border-green-100">{message}</div>}
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm text-center border border-red-100">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full bg-[#c5a666] text-white py-3 rounded uppercase tracking-widest font-medium hover:bg-[#b09458] transition-colors duration-300 shadow-md hover:shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Remember your password? <Link to="/login" className="text-[#c5a666] font-semibold hover:underline">Sign In</Link></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
