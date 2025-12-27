// Register.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Registration, 2: OTP Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/register', { 
        name, 
        email, 
        password, 
        phone 
      });
      
      setStep(2); // Move to OTP verification step
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/verify-otp', { 
        email, 
        otp 
      });
      
      localStorage.setItem('userInfo', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/resend-otp', { email });
      alert('OTP resent successfully! Check your email.');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 py-12 px-4 sm:px-6 lg:px-8 mt-[36px]">
       <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex-row-reverse">
          <div className="hidden md:block w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1617038224558-28ad3fb558a7?q=80&w=2070&auto=format&fit=crop')" }}>
            <div className="h-full w-full bg-black/20 flex items-center justify-center">
               <div className="text-white text-center p-8">
                  <h3 className="text-3xl font-serif mb-4">Join the Legacy</h3>
                  <p className="font-light tracking-wider">Start your journey with timeless elegance.</p>
               </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {step === 1 ? (
                <>
                  <h2 className="text-4xl font-serif text-gray-900 text-center mb-2">Create Account</h2>
                  <p className="text-gray-500 text-center mb-8 font-light">Be part of the Sera experience</p>
                  
                  {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm text-center border border-red-100">{error}</div>}
                  
                  <form onSubmit={handleRegister} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input 
                          type="text" 
                          className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input 
                          type="tel" 
                          className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
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
                      
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#c5a666] text-white py-3 rounded uppercase tracking-widest font-medium hover:bg-[#b09458] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                          {loading ? 'Processing...' : 'Sign Up'}
                      </button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-serif text-gray-900 text-center mb-2">Verify Email</h2>
                  <p className="text-gray-500 text-center mb-8 font-light">Enter the OTP sent to {email}</p>
                  
                  {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm text-center border border-red-100">{error}</div>}
                  
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                        <input 
                          type="text" 
                          maxLength="6"
                          className="w-full border border-gray-300 p-3 rounded text-center text-2xl tracking-widest focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          required
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#c5a666] text-white py-3 rounded uppercase tracking-widest font-medium hover:bg-[#b09458] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                          {loading ? 'Verifying...' : 'Verify Email'}
                      </button>

                      <button 
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        className="w-full text-[#c5a666] py-2 text-sm hover:underline disabled:opacity-50"
                      >
                          Resend OTP
                      </button>
                  </form>
                </>
              )}

              <div className="mt-8 text-center text-sm text-gray-600">
                <p>Already have an account? <Link to="/login" className="text-[#c5a666] font-semibold hover:underline">Sign in</Link></p>
              </div>
            </motion.div>
          </div>
       </div>
    </div>
  );
};

export default Register;
