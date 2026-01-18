import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';


const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const navigate = useNavigate();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (!storedUserInfo) {
          navigate('/login');
          return;
        }


        let userInfo;
        try {
          userInfo = JSON.parse(storedUserInfo);
        } catch (error) {
          console.error('Failed to parse userInfo from localStorage:', error);
          localStorage.removeItem('userInfo');
          navigate('/login');
          return;
        }


        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        
        // Fetch Cart
        const cartRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/cart`, config);
        setCartItems(cartRes.data.items || []);


        // Fetch Addresses (Profile)
        const profileRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, config);
        setAddresses(profileRes.data.addresses || []);
        
        if (profileRes.data.addresses && profileRes.data.addresses.length > 0) {
          setSelectedAddress(profileRes.data.addresses[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching checkout data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);


  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code.');
      return;
    }


    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (!storedUserInfo) {
        navigate('/login');
        return;
      }


      let userInfo;
      try {
        userInfo = JSON.parse(storedUserInfo);
      } catch (error) {
        console.error('Failed to parse userInfo from localStorage:', error);
        localStorage.removeItem('userInfo');
        navigate('/login');
        return;
      }


      // ✅ FIXED: Calculate cartValue (subtotal) and orderTotal separately
      const cartValue = cartItems.reduce(
        (acc, item) => acc + item.quantity * item.product.price,
        0
      );
      const shippingValue = cartValue > 999 ? 0 : 100;
      const orderTotal = cartValue + shippingValue;


      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };


      setCouponLoading(true);
      setCouponError('');


      // ✅ FIXED: Send both cartValue and orderTotal separately
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/coupons/validate`,
        {
          code: couponCode,
          cartValue, // ✅ Subtotal only (without shipping)
          orderTotal, // ✅ Subtotal + shipping
        },
        config
      );


      setAppliedCoupon(data);
      toast.success(
        `Coupon applied! You saved INR ${data.discountAmount.toFixed(0)}`
      );
    } catch (error) {
      console.error('Error validating coupon:', error);
      setAppliedCoupon(null);
      const message =
        error.response?.data?.message || 'Invalid or expired coupon.';
      setCouponError(message);
      toast.error(message);
    } finally {
      setCouponLoading(false);
    }
  };


  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select or add a shipping address.');
      return;
    }


    // ✅ VALIDATE ADDRESS HAS ALL REQUIRED FIELDS
    if (!selectedAddress.street || !selectedAddress.city || !selectedAddress.state || 
        !selectedAddress.postalCode || !selectedAddress.phone) {
      toast.error('Shipping address is incomplete. Please update your address.');
      console.error('Invalid address:', selectedAddress);
      return;
    }


    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (!storedUserInfo) {
        navigate('/login');
        return;
      }


      let userInfo;
      try {
        userInfo = JSON.parse(storedUserInfo);
      } catch (error) {
        console.error('Failed to parse userInfo from localStorage:', error);
        localStorage.removeItem('userInfo');
        navigate('/login');
        return;
      }


      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      
      // ✅ BUILD ORDER DATA WITH COMPLETE ADDRESS STRUCTURE
      const orderData = {
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: {
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode,
          country: selectedAddress.country || 'India',
          phone: selectedAddress.phone,
          landmark: selectedAddress.landmark || ''
        },
        paymentMethod,
        totalPrice: total,
        couponCode: appliedCoupon?.code || undefined
      };


      console.log('Sending order data:', orderData); // ✅ DEBUG LOG


      await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, orderData, config);
      
      toast.success('Order placed successfully!');
      navigate('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order.';
      toast.error(errorMsg);
    }
  };


  // ✅ FIXED: Calculate values correctly
  const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
  const shipping = subtotal > 999 ? 0 : 100;
  const originalTotal = subtotal + shipping;
  const total = appliedCoupon?.finalTotal || originalTotal;
  const discount = Math.max(0, appliedCoupon ? appliedCoupon.discountAmount : 0);


  if (loading) return <div className="text-center py-20">Loading Checkout...</div>;


  return (
    <div className="container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-serif text-center mb-12">Checkout</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Side: Address & Payment */}
        <div className="lg:w-2/3 space-y-8">
          
          {/* Address Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-2xl font-serif mb-6">Shipping Address</h2>
            {addresses.length === 0 ? (
              <div className="text-center py-6">
                <p className="mb-4 text-gray-500">No addresses found.</p>
                <button 
                  onClick={() => navigate('/profile?tab=addresses')}
                  className="text-rose-600 hover:underline"
                >
                  Add an address in your profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr, index) => (
                  <div 
                    key={addr._id || index}
                    onClick={() => setSelectedAddress(addr)}
                    className={`p-4 border rounded cursor-pointer transition-all ${
                      selectedAddress?._id === addr._id || selectedAddress === addr
                        ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' 
                        : 'border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <p className="font-bold">{addr.street}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.state}</p>
                    <p className="text-sm text-gray-600">{addr.postalCode}, {addr.country || 'India'}</p>
                    <p className="text-sm text-gray-600">📞 {addr.phone}</p>
                    {addr.landmark && <p className="text-xs text-gray-500 italic">Near: {addr.landmark}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Payment Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-2xl font-serif mb-6">Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border rounded cursor-pointer hover:bg-gray-50">
                <input 
                  type="radio" 
                  name="payment" 
                  value="cod" 
                  checked={paymentMethod === 'cod'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-rose-500 focus:ring-rose-500"
                />
                <span className="font-medium">Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-3 p-4 border rounded cursor-not-allowed opacity-50">
                 <input type="radio" name="payment" disabled />
                 <span>Credit/Debit Card (Coming Soon)</span>
              </label>
            </div>
          </div>
        </div>


        {/* Right Side: Order Summary */}
        <div className="lg:w-1/3">
           <div className="bg-rose-50 p-8 rounded-lg sticky top-24">
              <h3 className="font-serif text-2xl mb-6">Your Order</h3>
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2">
                {cartItems.map(item => (
                  <div key={item.product._id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                       <span className="text-gray-500">{item.quantity}x</span>
                       <span className="truncate max-w-[150px]">{item.product.name}</span>
                    </div>
                    <span>INR {item.quantity * item.product.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Have a coupon?
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {couponLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="mt-2 text-xs text-green-700">
                    Coupon {appliedCoupon.code} applied. You save INR{' '}
                    {discount.toFixed(0)}.
                  </p>
                )}
                {couponError && (
                  <p className="mt-2 text-xs text-red-600">{couponError}</p>
                )}
              </div>


              <div className="border-t border-gray-300 pt-4 space-y-2 mt-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>INR {subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `INR ${shipping}`}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>
                      Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ''}
                    </span>
                    <span>- INR {discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>INR {total}</span>
                </div>
              </div>


              <button 
                onClick={handlePlaceOrder}
                disabled={cartItems.length === 0 || !selectedAddress}
                className="w-full mt-8 bg-black text-white py-4 rounded uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Order
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};


export default Checkout;