import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 py-12 px-4 sm:px-6 lg:px-8 mt-[36px]">
      <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Image Section */}
        <div className="hidden md:block w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=2075&auto=format&fit=crop')" }}>
          <div className="h-full w-full bg-black/20 flex items-center justify-center">
             <div className="text-white text-center p-8">
                <h3 className="text-3xl font-serif mb-4">Welcome Back</h3>
                <p className="font-light tracking-wider">Rediscover elegance with every login.</p>
             </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-serif text-gray-900 text-center mb-2">Log In</h2>
            <p className="text-gray-500 text-center mb-8 font-light">Access your personal jewelry collection</p>
            
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <button type="submit" className="w-full bg-[#c5a666] text-white py-3 rounded uppercase tracking-widest font-medium hover:bg-[#b09458] transition-colors duration-300 shadow-md hover:shadow-lg">
                    Log In
                </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-600">
              <p className="mb-2"><Link to="/forgot-password" className="text-gray-500 hover:text-rose-500 transition-colors">Forgot your password?</Link></p>
              <p>Don't have an account? <Link to="/register" className="text-[#c5a666] font-semibold hover:underline">Create one</Link></p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
