import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaMapMarkerAlt, FaEdit, FaBox } from 'react-icons/fa';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'addresses');
  const [addresses, setAddresses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [exchangeReason, setExchangeReason] = useState('');
  
  // Address Form States
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', pincode: '', addressType: 'Home' });

  // Profile Edit States
  const [profileData, setProfileData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['orders', 'addresses', 'wishlist', 'details'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchProfile = async () => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) {
      navigate('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(storedUserInfo);
      setUserInfo(parsedUser);
      setProfileData({ ...profileData, name: parsedUser.name, email: parsedUser.email });

      const config = {
        headers: {
          Authorization: `Bearer ${parsedUser.token}`,
        },
      };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, config);
      setAddresses(data.addresses || []);
      
      const wishlistRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/wishlist`, config);
      setWishlist(wishlistRes.data || []);

      // Fetch Orders
      try {
        const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/orders`, config);
        setOrders(ordersRes.data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('userInfo');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [navigate]);

  const updateAddresses = async (updatedAddresses) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, { addresses: updatedAddresses }, config);
      setAddresses(data.addresses);
    } catch (error) {
      console.error('Error updating addresses:', error);
      alert('Failed to update addresses');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Cancellation fees may apply.')) return;
    
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/cancel`, {}, config);
      alert(`Order cancelled successfully. ${data.cancellationFee > 0 ? `Cancellation fee: INR${data.cancellationFee}` : 'No cancellation fee.'} Refund: INR${data.refundAmount}`);
      fetchProfile();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleExchangeRequest = async () => {
    if (!exchangeReason) {
      alert('Please select a reason for exchange');
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/orders/${selectedOrderId}/exchange`, { reason: exchangeReason }, config);
      alert(`Exchange requested successfully. ${data.exchangeFee > 0 ? `Exchange fee: INR${data.exchangeFee}` : 'Free exchange (damaged/defective item)'}`);
      setExchangeModalOpen(false);
      setExchangeReason('');
      fetchProfile();
    } catch (error) {
      console.error('Error requesting exchange:', error);
      alert(error.response?.data?.message || 'Failed to request exchange');
    }
  };

  const canCancelOrder = (order) => {
    return order.status === 'pending' || order.status === 'processing';
  };

  const canExchangeOrder = (order) => {
    if (order.status !== 'delivered') return false;
    const deliveryDate = order.deliveredAt || order.updatedAt;
    const daysSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= 3;
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    let updatedAddresses;
    
    if (editingId) {
      updatedAddresses = addresses.map(addr => 
        (addr._id === editingId || addr.id === editingId) ? { ...newAddress, _id: editingId } : addr
      );
    } else {
      updatedAddresses = [...addresses, { ...newAddress, isDefault: addresses.length === 0 }];
    }

    await updateAddresses(updatedAddresses);
    setIsAdding(false);
    setEditingId(null);
    setNewAddress({ street: '', city: '', state: '', pincode: '', addressType: 'Home' });
  };

  const handleEditAddress = (addr) => {
    setNewAddress({
      street: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      addressType: addr.addressType
    });
    setEditingId(addr._id || addr.id);
    setIsAdding(true);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewAddress({ street: '', city: '', state: '', pincode: '', addressType: 'Home' });
  };

  const handleDelete = async (id) => {
    const updatedAddresses = addresses.filter(a => (a._id || a.id) !== id);
    await updateAddresses(updatedAddresses);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileData.password !== profileData.confirmPassword) {
      setProfileMessage('Passwords do not match');
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      
      const updatePayload = {
        name: profileData.name,
        email: profileData.email
      };
      if (profileData.password) {
        updatePayload.password = profileData.password;
      }

      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, updatePayload, config);
      
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUserInfo(data);
      setProfileData({ ...profileData, name: data.name, email: data.email, password: '', confirmPassword: '' });
      setProfileMessage('Profile updated successfully');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage('Failed to update profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  return (
    <div className="container mx-auto px-6 py-24">
      <h1 className="text-4xl font-serif mb-8 text-gray-900">My Account</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-1/4">
          <div className="bg-rose-50 p-6 rounded-lg shadow-sm">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`block w-full text-left py-2 px-3 rounded transition-colors ${activeTab === 'orders' ? 'bg-white text-rose-500 font-bold shadow-sm' : 'text-gray-600 hover:bg-rose-100'}`}
            >
              My Orders
            </button>
            <button 
              onClick={() => setActiveTab('addresses')}
              className={`block w-full text-left py-2 px-3 rounded transition-colors ${activeTab === 'addresses' ? 'bg-white text-rose-500 font-bold shadow-sm' : 'text-gray-600 hover:bg-rose-100'}`}
            >
              Addresses
            </button>
            <button 
              onClick={() => setActiveTab('wishlist')}
              className={`block w-full text-left py-2 px-3 rounded transition-colors ${activeTab === 'wishlist' ? 'bg-white text-rose-500 font-bold shadow-sm' : 'text-gray-600 hover:bg-rose-100'}`}
            >
              Wishlist
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`block w-full text-left py-2 px-3 rounded transition-colors ${activeTab === 'details' ? 'bg-white text-rose-500 font-bold shadow-sm' : 'text-gray-600 hover:bg-rose-100'}`}
            >
              Account Details
            </button>
            <button onClick={handleLogout} className="block w-full text-left py-2 px-3 text-gray-600 mt-4 pt-4 border-t border-rose-200 hover:text-rose-600">
              Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full md:w-3/4">
          {activeTab === 'addresses' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-gray-900">Saved Addresses</h2>
                {!isAdding && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-rose-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-rose-600 transition-colors shadow-sm"
                  >
                    <FaPlus /> Add New Address
                  </button>
                )}
              </div>

              {isAdding && (
                <div className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-sm animate-fade-in">
                  <h3 className="font-serif text-lg mb-4">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
                  <form onSubmit={handleSaveAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      placeholder="Full Address" 
                      className="border p-2 rounded md:col-span-2 focus:ring-1 focus:ring-rose-500 outline-none" 
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="City" 
                      className="border p-2 rounded focus:ring-1 focus:ring-rose-500 outline-none" 
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="State" 
                      className="border p-2 rounded focus:ring-1 focus:ring-rose-500 outline-none" 
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Pincode" 
                      className="border p-2 rounded focus:ring-1 focus:ring-rose-500 outline-none" 
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                      required
                    />
                    <select
                      className="border p-2 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                      value={newAddress.addressType}
                      onChange={(e) => setNewAddress({...newAddress, addressType: e.target.value})}
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="md:col-span-2 mt-2">
                      <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                        {editingId ? 'Update Address' : 'Save Address'}
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="ml-4 text-gray-500 hover:text-gray-700">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((addr) => (
                  <div key={addr._id || addr.id} className="border border-gray-200 p-6 rounded-lg relative hover:shadow-md transition-shadow bg-white">
                    {addr.isDefault && <span className="bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded absolute top-4 right-4">Default</span>}
                    <div className="flex items-start gap-3 mb-4">
                      <FaMapMarkerAlt className="text-rose-500 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{addr.addressType}</p>
                        <p className="text-gray-600">{addr.street}</p>
                        <p className="text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                      <button onClick={() => handleEditAddress(addr)} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-800">
                        <FaEdit /> Edit
                      </button>
                      <button onClick={() => handleDelete(addr._id || addr.id)} className="text-red-600 text-sm font-medium flex items-center gap-1 hover:text-red-800">
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-serif text-gray-900 mb-6">My Orders</h2>
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <FaBox className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p className="text-gray-500">No orders found.</p>
                  <button onClick={() => navigate('/shop')} className="mt-4 text-rose-500 font-medium hover:underline">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order._id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Order ID</p>
                          <p className="font-mono font-medium text-gray-900">#{order._id.substring(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
                          <p className="text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                          <p className="font-medium text-gray-900">INR{order.totalPrice}</p>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'processing' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            order.status === 'exchange_requested' ? 'bg-orange-100 text-orange-700' :
                            order.status === 'exchange_approved' ? 'bg-teal-100 text-teal-700' :
                            order.status === 'exchanged' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                              {item.product?.images?.[0] && (
                                <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-serif text-gray-900">{item.product?.name || 'Product'}</h4>
                              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">INR{item.price}</p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Cancel/Exchange Buttons */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                          {canCancelOrder(order) && (
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                            >
                              Cancel Order {order.status === 'processing' ? '(INR100 fee)' : ''}
                            </button>
                          )}
                          {canExchangeOrder(order) && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(order._id);
                                setExchangeModalOpen(true);
                              }}
                              className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                            >
                              Request Exchange
                            </button>
                          )}
                          {order.status === 'exchange_requested' && (
                            <p className="text-sm text-orange-600 italic">Exchange request pending admin approval...</p>
                          )}
                          {order.status === 'cancelled' && order.cancellationFee > 0 && (
                            <p className="text-sm text-gray-600">Cancellation Fee: INR{order.cancellationFee} | Refund: INR{order.refundAmount}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div>
              <h2 className="text-2xl font-serif text-gray-900 mb-6">My Wishlist</h2>
              {wishlist.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">Your wishlist is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((item) => (
                    <div key={item._id} className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="h-48 bg-gray-100 relative group">
                        <img src={item.images?.[0] || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => navigate(`/product/${item._id}`)} className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-rose-500 hover:text-white transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-serif text-lg text-gray-900 truncate">{item.name}</h3>
                        <p className="text-rose-600 font-medium mt-1">INR{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div>
              <h2 className="text-2xl font-serif text-gray-900 mb-6">Account Details</h2>
              <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm">
                {profileMessage && (
                  <div className={`p-4 mb-6 rounded ${profileMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {profileMessage}
                  </div>
                )}
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-rose-500 outline-none"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input 
                        type="email"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-rose-500 outline-none"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-serif text-gray-900 mb-4">Password Change</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password (required to set new password)</label>
                        <input 
                          type="password"
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-rose-500 outline-none"
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <input 
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-rose-500 outline-none"
                            value={profileData.password}
                            onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                          <input 
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-rose-500 outline-none"
                            value={profileData.confirmPassword}
                            onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded hover:bg-gray-800 transition-colors uppercase tracking-wider text-sm">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exchange Modal */}
      {exchangeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full">
            <h3 className="text-2xl font-serif mb-4">Request Exchange</h3>
            <p className="text-sm text-gray-600 mb-4">Select reason for exchange:</p>
            <select
              value={exchangeReason}
              onChange={(e) => setExchangeReason(e.target.value)}
              className="w-full border p-2 rounded mb-4 focus:ring-1 focus:ring-rose-500 outline-none"
            >
              <option value="">-- Select Reason --</option>
              <option value="damaged">Received Damaged/ Defective Product (Free Exchange)</option>
              <option value="wrong_item">Wrong Item Received (Free Exchange)</option>
              <option value="changed_mind">Changed My Mind (INR100 fee)</option>
              <option value="other"> Others (INR100 fee)</option>
              
            </select>
            <p className="text-xs text-gray-500 mb-6">
              * Exchange window: 3 days from delivery<br/>
              * Free exchange for damaged/defective items
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExchangeRequest}
                className="flex-1 bg-rose-500 text-white px-4 py-2 rounded hover:bg-rose-600 transition-colors"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setExchangeModalOpen(false);
                  setExchangeReason('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
