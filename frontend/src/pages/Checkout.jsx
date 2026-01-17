import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
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

      const baseOrderItems = cartItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const shippingAddressPayload = {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country || 'India',
        phone: selectedAddress.phone,
        landmark: selectedAddress.landmark || ''
      };

      const baseTotal = total;
      const appliedCode = appliedCoupon ? appliedCoupon.code : couponCode.trim() || null;

      if (paymentMethod === 'cod') {
        const orderData = {
          orderItems: baseOrderItems,
          shippingAddress: shippingAddressPayload,
          paymentMethod,
          totalPrice: baseTotal,
          couponCode: appliedCode
        };

        await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, orderData, config);
        toast.success('Order placed successfully!');
        navigate('/order-success');
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Unable to load payment gateway. Please try again.');
        return;
      }

      const createPayload = {
        orderItems: baseOrderItems,
        shippingAddress: shippingAddressPayload,
        orderTotal: baseTotal,
        couponCode: appliedCode
      };

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/orders/razorpay/create`,
        createPayload,
        config
      );

      const options = {
        key: data.key,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        name: 'SERA',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        prefill: {
          name: userInfo.name || '',
          email: userInfo.email || '',
          contact: selectedAddress.phone
        },
        notes: {
          orderId: data.orderId
        },
        theme: {
          color: '#c5a666'
        },
        handler: async (response) => {
          try {
            await axios.post(
              `${import.meta.env.VITE_API_URL}/api/orders/razorpay/verify`,
              {
                orderId: data.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              config
            );
            toast.success('Payment successful!');
            navigate('/order-success');
          } catch (err) {
            console.error('Payment verification failed:', err);
            const msg =
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Payment verification failed';
            toast.error(msg);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (response) => {
        console.error('Payment failed:', response);
        toast.error('Payment failed. Please try again.');
      });
      razorpayInstance.open();
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order.';
      toast.error(errorMsg);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
  const shipping = subtotal > 999 ? 0 : 100;
  const total = subtotal + shipping;
  const payableTotal = Math.max(total - couponDiscount, 0);

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
              <label className="flex items-center gap-3 p-4 border rounded cursor-pointer hover:bg-gray-50">
                <input 
                  type="radio" 
                  name="payment" 
                  value="online" 
                  checked={paymentMethod === 'online'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-rose-500 focus:ring-rose-500"
                />
                <span className="font-medium">Online Payment (Card/UPI via Razorpay)</span>
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
              
              <div className="border-t border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>INR {subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `INR ${shipping}`}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- INR {couponDiscount}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={async () => {
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
                          const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                          setCouponLoading(true);
                          const { data } = await axios.post(
                            `${import.meta.env.VITE_API_URL}/api/coupons/validate`,
                            {
                              code: couponCode.trim(),
                              orderTotal: total
                            },
                            config
                          );
                          setCouponDiscount(data.discountAmount);
                          setAppliedCoupon(data);
                          toast.success('Coupon applied successfully');
                        } catch (err) {
                          console.error('Coupon validation failed:', err);
                          const msg =
                            err.response?.data?.message ||
                            err.response?.data?.error ||
                            'Invalid coupon code';
                          toast.error(msg);
                          setCouponDiscount(0);
                          setAppliedCoupon(null);
                        } finally {
                          setCouponLoading(false);
                        }
                      }}
                      disabled={couponLoading}
                      className="px-4 py-2 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 disabled:opacity-50"
                    >
                      {couponLoading ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-700">
                      Applied {appliedCoupon.code} (
                      {appliedCoupon.discountType === 'percentage'
                        ? `${appliedCoupon.discountValue}%`
                        : `INR ${appliedCoupon.discountValue}`}
                      ) – You save INR {couponDiscount}
                    </p>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>INR {payableTotal}</span>
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
