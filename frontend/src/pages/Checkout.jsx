import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
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
      alert('Please select or add a shipping address.');
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
      
      const orderData = {
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: selectedAddress,
        paymentMethod,
        totalPrice: total
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, orderData, config);
      
      // Optionally clear cart here if backend doesn't do it automatically
      // await axios.delete('`${import.meta.env.VITE_API_URL}`/api/cart', config); // If we implemented clear cart endpoint

      // alert('Order placed successfully!');
      navigate('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order.');
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
  const shipping = subtotal > 999 ? 0 : 100;
  const total = subtotal + shipping;

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
                  onClick={() => navigate('/profile')}
                  className="text-rose-600 hover:underline"
                >
                  Add an address in your profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedAddress(addr)}
                    className={`p-4 border rounded cursor-pointer transition-all ${
                      selectedAddress === addr 
                        ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' 
                        : 'border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <p className="font-bold">{addr.street}</p>
                    <p>{addr.city}, {addr.state}</p>
                    <p>{addr.pincode}</p>
                    <p>{addr.country}</p>
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
              {/* Add more payment methods here */}
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
                    <span>Rs. {item.quantity * item.product.price}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `Rs. ${shipping}`}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>Rs. {total}</span>
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={cartItems.length === 0}
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
