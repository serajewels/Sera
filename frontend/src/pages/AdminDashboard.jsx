import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCheck, FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  // PAGINATION STATE FOR ALL SECTIONS
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Items per page for all sections

  const [orderForm, setOrderForm] = useState({
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      phone: '',
      landmark: ''
    },
    status: '',
    items: []
  });

  const [selectedContact, setSelectedContact] = useState(null);
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    expiryDate: '',
    usageLimit: '',
    perUserLimit: 1,
    isActive: true,
    isFirstOrderOnly: false,
    restrictedToUserEmail: '',
  });
  const [editingCouponId, setEditingCouponId] = useState(null);
  
  const fetchAllProducts = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products?limit=1000`);
      setAllProducts(
        Array.isArray(data?.products) 
          ? data.products 
          : Array.isArray(data) 
          ? data 
          : []
      );
    } catch (error) {
      console.error('Error fetching all products:', error);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'NECKLACE',
    stock: '',
    description: '',
    images: [],
    selectedStyles: [],
    accentPairs: '',
  });

  const convertDriveLink = (link) => {
    try {
      if (link.includes('drive.google.com')) {
        let id = '';
        const parts = link.split('/');
        if (link.includes('/file/d/')) {
          const index = parts.indexOf('d');
          if (index !== -1 && parts[index + 1]) {
            id = parts[index + 1];
          }
        } else if (link.includes('id=')) {
          const params = new URLSearchParams(link.split('?')[1]);
          id = params.get('id');
        }

        if (id) {
          id = id.split('?')[0].split('&')[0];
          return `https://drive.google.com/uc?export=view&id=${id}`;
        }
      }
      return link;
    } catch (e) {
      return link;
    }
  };

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef(null);

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    role: '',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  const getUserInfo = () => {
    const stored = localStorage.getItem('userInfo');
    return stored ? JSON.parse(stored) : null;
  };

  const filterProducts = useCallback((products) => {
    return products.filter((product) => {
      const matchesSearch = !debouncedSearch || 
        product.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = !filters.category || product.category === filters.category;
      
      const price = parseFloat(product.price) || 0;
      const matchesMinPrice = !filters.minPrice || price >= parseFloat(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || price <= parseFloat(filters.maxPrice);
      
      const stock = parseInt(product.stock) || 0;
      const matchesMinStock = !filters.minStock || stock >= parseInt(filters.minStock);

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesMinStock;
    });
  }, [debouncedSearch, filters]);

  const filterUsers = useCallback((users) => {
    return users.filter((user) => {
      const matchesSearch = !debouncedSearch || 
        user.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesRole = !filters.role || user.role === filters.role;

      return matchesSearch && matchesRole;
    });
  }, [debouncedSearch, filters]);

  const filterContacts = useCallback((contacts) => {
    return contacts.filter((contact) => {
      const matchesSearch = !debouncedSearch || 
        contact.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        contact.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        contact.subject?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        contact.message?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesStatus = !filters.status || contact.status === filters.status;

      const createdAt = new Date(contact.createdAt);
      const matchesDateFrom = !filters.dateFrom || createdAt >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || createdAt <= new Date(filters.dateTo);

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [debouncedSearch, filters]);

  const filterOrders = useCallback((orders) => {
    return orders.filter((order) => {
      const userName = order.user?.name || '';
      const matchesSearch = !debouncedSearch || 
        userName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order._id?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = !filters.status || order.status === filters.status;

      const createdAt = new Date(order.createdAt);
      const matchesDateFrom = !filters.dateFrom || createdAt >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || createdAt <= new Date(filters.dateTo);

      const totalPrice = parseFloat(order.totalPrice) || 0;
      const matchesMinPrice = !filters.minPrice || totalPrice >= parseFloat(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || totalPrice <= parseFloat(filters.maxPrice);

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesMinPrice && matchesMaxPrice;
    });
  }, [debouncedSearch, filters]);

  const downloadInvoice = async (orderId) => {
    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = {
        headers: { Authorization: `Bearer ${ui.token}` },
        responseType: 'blob'
      };
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/invoice`,
        config
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Invoice-${String(orderId).substring(0, 8)}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const filterCoupons = useCallback(
    (items) => {
      return items.filter((coupon) => {
        const matchesSearch =
          !debouncedSearch ||
          coupon.code?.toLowerCase().includes(debouncedSearch.toLowerCase());

        const matchesStatus =
          !filters.status ||
          (filters.status === 'active'
            ? coupon.isActive
            : !coupon.isActive);

        return matchesSearch && matchesStatus;
      });
    },
    [debouncedSearch, filters]
  );

  const filteredProducts = useMemo(() => filterProducts(products), [products, filterProducts]);
  const filteredUsers = useMemo(() => filterUsers(users), [users, filterUsers]);
  const filteredContacts = useMemo(() => filterContacts(contacts), [contacts, filterContacts]);
  const filteredOrders = useMemo(() => filterOrders(orders), [orders, filterOrders]);
  const filteredCategories = categories;
  const filteredCoupons = useMemo(() => filterCoupons(coupons), [coupons, filterCoupons]);

  // PAGINATION LOGIC - Works for all sections
  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const paginatedProducts = useMemo(() => getPaginatedData(filteredProducts), [filteredProducts, currentPage]);
  const paginatedUsers = useMemo(() => getPaginatedData(filteredUsers), [filteredUsers, currentPage]);
  const paginatedContacts = useMemo(() => getPaginatedData(filteredContacts), [filteredContacts, currentPage]);
  const paginatedOrders = useMemo(() => getPaginatedData(filteredOrders), [filteredOrders, currentPage]);
  const paginatedCategories = useMemo(() => getPaginatedData(filteredCategories), [filteredCategories, currentPage]);
  const paginatedCoupons = useMemo(() => getPaginatedData(filteredCoupons), [filteredCoupons, currentPage]);

  // Calculate total pages for each section
  const getTotalPages = (data) => Math.ceil(data.length / itemsPerPage);
  
  const totalPagesProducts = getTotalPages(filteredProducts);
  const totalPagesUsers = getTotalPages(filteredUsers);
  const totalPagesContacts = getTotalPages(filteredContacts);
  const totalPagesOrders = getTotalPages(filteredOrders);
  const totalPagesCategories = getTotalPages(filteredCategories);
  const totalPagesCoupons = getTotalPages(filteredCoupons);

  useEffect(() => {
    const ui = getUserInfo();
    if (!ui || ui.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1); // Reset pagination when fetching new data
    try {
      const ui = getUserInfo();
      if (!ui || ui.role !== 'admin') {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };

      if (activeTab === 'products') {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products?limit=1000`);
        const productList = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        setProducts(productList);
      } else if (activeTab === 'users') {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/users`, config);
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === 'categories') {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
        setCategories(Array.isArray(data) ? data : []);
      } else if (activeTab === 'coupons') {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/coupons`, config);
        setCoupons(Array.isArray(data) ? data : []);
      } else if (activeTab === 'contact') {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/contact`, config);
        setContacts(Array.isArray(data?.data) ? data.data : []);
      } else if (activeTab === 'orders') {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/orders/all/admin`,
          config
        );
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setProducts([]);
      setUsers([]);
      setCategories([]);
      setContacts([]);
      setOrders([]);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, navigate]);

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setFilters({
      category: '',
      status: '',
      role: '',
      minPrice: '',
      maxPrice: '',
      minStock: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`,
        { status: newStatus },
        config
      );
      fetchData();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleExchangeApproval = async (orderId, approved) => {
    if (
      !window.confirm(
        `Are you sure you want to ${approved ? 'approve' : 'reject'} this exchange request?`
      )
    )
      return;

    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/exchange/approve`,
        { approved },
        config
      );
      alert(`Exchange ${approved ? 'approved' : 'rejected'} successfully`);
      fetchData();
    } catch (error) {
      console.error('Error handling exchange:', error);
      alert('Failed to process exchange request');
    }
  };

  const openOrderEditModal = async (order) => {
    setEditingOrder(order);
    setOrderForm({
      shippingAddress: {
        street: order.shippingAddress?.street || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        postalCode: order.shippingAddress?.postalCode || '',
        country: order.shippingAddress?.country || 'India',
        phone: order.shippingAddress?.phone || '',
        landmark: order.shippingAddress?.landmark || ''
      },
      status: order.status || 'pending',
      items: order.items.map(item => ({
        product: item.product?._id || item.product || '',
        quantity: item.quantity || 1
      }))
    });
    setIsOrderModalOpen(true);
    await fetchAllProducts();
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();

    const validItems = orderForm.items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Order must have at least one valid item');
      return;
    }

    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      
      const payload = {
        ...orderForm,
        items: validItems
      };

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/orders/${editingOrder._id}/update`,
        payload,
        config
      );
      
      alert('Order updated successfully');
      setIsOrderModalOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      console.error('Error updating order:', error);
      alert(error.response?.data?.message || 'Failed to update order');
    }
  };

  const handleCategoryDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/categories/${id}`, config);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: '',
      expiryDate: '',
      usageLimit: '',
      perUserLimit: 1,
      isActive: true,
      isFirstOrderOnly: false,
      restrictedToUserEmail: '',
    });
    setEditingCouponId(null);
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();

    const ui = getUserInfo();
    if (!ui) {
      navigate('/login');
      return;
    }

    const config = { headers: { Authorization: `Bearer ${ui.token}` } };

    const payload = {
      code: couponForm.code.toUpperCase().trim(),
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      minOrderValue: couponForm.minOrderValue
        ? Number(couponForm.minOrderValue)
        : 0,
      expiryDate: couponForm.expiryDate || null,
      usageLimit: couponForm.usageLimit
        ? Number(couponForm.usageLimit)
        : null,
      perUserLimit: couponForm.perUserLimit
        ? Number(couponForm.perUserLimit)
        : 1,
      isActive: couponForm.isActive,
      isFirstOrderOnly: couponForm.isFirstOrderOnly,
      restrictedToUserEmail: couponForm.restrictedToUserEmail.trim() || null,
    };

    if (!payload.code) {
      toast.error('Coupon code is required');
      return;
    }

    if (!payload.discountValue || payload.discountValue <= 0) {
      toast.error('Discount value must be greater than zero');
      return;
    }

    if (
      payload.discountType === 'percentage' &&
      payload.discountValue > 100
    ) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    try {
      if (editingCouponId) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/coupons/${editingCouponId}`,
          payload,
          config
        );
        toast.success('Coupon updated successfully');
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/coupons`,
          payload,
          config
        );
        toast.success('Coupon created successfully');
      }
      resetCouponForm();
      fetchData();
    } catch (error) {
      console.error('Error saving coupon:', error);
      const message =
        error.response?.data?.message || 'Failed to save coupon';
      toast.error(message);
    }
  };

  const handleCouponEdit = (coupon) => {
    setEditingCouponId(coupon._id);
    setCouponForm({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || '',
      minOrderValue: coupon.minOrderValue ?? '',
      expiryDate: coupon.expiryDate
        ? coupon.expiryDate.substring(0, 10)
        : '',
      usageLimit: coupon.usageLimit ?? '',
      perUserLimit: coupon.perUserLimit || 1,
      isActive: coupon.isActive,
      isFirstOrderOnly: coupon.isFirstOrderOnly || false,
      restrictedToUserEmail:
        coupon.allowedUsers && coupon.allowedUsers.length > 0
          ? coupon.allowedUsers[0].email || ''
          : '',
    });
  };

  const handleCouponDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;

    const ui = getUserInfo();
    if (!ui) {
      navigate('/login');
      return;
    }

    const config = { headers: { Authorization: `Bearer ${ui.token}` } };

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/coupons/${id}`,
        config
      );
      toast.success('Coupon deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      const message =
        error.response?.data?.message || 'Failed to delete coupon';
      toast.error(message);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleOpenModal = async (product = null) => {
    if (product) {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/products/${product._id}`);
        setEditingProduct(data);
        
        const currentTags = data.tags || [];
        const validStyles = ['minimalist', 'boho', 'everyday', 'accent'];
        const foundStyles = currentTags.filter(t => validStyles.includes(t));

        setFormData({
          name: data.name || '',
          price: data.price || '',
          category: data.category || 'NECKLACE',
          stock: data.stock || '',
          description: data.description || '',
          images: Array.isArray(data.images) ? data.images : [],
          selectedStyles: foundStyles,
          accentPairs: data.accentPairs ? data.accentPairs.map(p => (typeof p === 'object' ? p.name : p)).join(', ') : '',
        });
      } catch (error) {
        console.error("Failed to fetch product details", error);
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            price: product.price || '',
            category: product.category || 'NECKLACE',
            stock: product.stock || '',
            description: product.description || '',
            images: Array.isArray(product.images) ? product.images : [],
            selectedStyles: [],
            accentPairs: product.accentPairs ? product.accentPairs.join(', ') : '',
        });
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        category: 'NECKLACE',
        stock: '',
        description: '',
        images: [],
        selectedStyles: [],
        accentPairs: '',
      });
    }
    setIsModalOpen(true);
  };

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);
    setUploading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload`, formDataUpload, config);
      
      const imageUrl = data.url;
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
      
      setUploading(false);
    } catch (error) {
      console.error(error);
      setUploading(false);
      alert('Image upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/products/${id}`, config);
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ui = getUserInfo();
    if (!ui) {
      navigate('/login');
      return;
    }
    const config = { headers: { Authorization: `Bearer ${ui.token}` } };

    const tags = [...formData.selectedStyles];

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: parseInt(formData.stock),
      description: formData.description,
      images: formData.images
        .map((img) => {
          if (img.includes('cloudinary.com') || img.includes('drive.google.com')) {
            return img;
          }
          return convertDriveLink(img);
        })
        .filter((img) => img !== ''),
      tags: tags,
      accentPairs: formData.accentPairs ? formData.accentPairs.split(',').map(id => id.trim()).filter(id => id) : [],
    };

    try {
      if (editingProduct) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/products/${editingProduct._id}`,
          productData,
          config
        );
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/products`, productData, config);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    }
  };

  const handleContactStatusChange = async (contactId, newStatus) => {
    try {
      const ui = getUserInfo();
      if (!ui) {
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${ui.token}` } };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/contact/${contactId}/status`,
        { status: newStatus },
        config
      );
      fetchData();
    } catch (error) {
      console.error('Error updating contact status:', error);
      alert('Failed to update contact status');
    }
  };

  const openContactModal = (contact) => {
    setSelectedContact(contact);
  };

  const closeContactModal = () => {
    setSelectedContact(null);
  };

  const FilterControls = () => {
    const currentTab = activeTab;
    const hasActiveFilters = searchInput !== '' || Object.values(filters).some(f => f !== '');
    
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <div className="relative flex-1 min-w-0">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${currentTab === 'products' ? 'products' : 
                             currentTab === 'users' ? 'users' : 
                             currentTab === 'contact' ? 'contacts' : 
                             currentTab === 'orders' ? 'orders' : 'items'}...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            {['products', 'contact', 'orders', 'coupons'].includes(currentTab) && (
              <div className="flex gap-2">
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">All Status</option>
                  {currentTab === 'products' && (
                    <>
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </>
                  )}
                  {currentTab === 'contact' && (
                    <>
                      <option value="New">New</option>
                      <option value="Read">Read</option>
                      <option value="Replied">Replied</option>
                    </>
                  )}
                  {currentTab === 'orders' && (
                    <>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="exchange_requested">Exchange Requested</option>
                    </>
                  )}
                  {currentTab === 'coupons' && (
                    <>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              Clear
            </button>
            <button
              onClick={fetchData}
              className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-1 text-sm"
              disabled={loading}
            >
              <FaFilter /> Filter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          {currentTab === 'products' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">All Categories</option>
                  <option value="NECKLACE">NECKLACE</option>
                  <option value="EARRINGS">EARRINGS</option>
                  <option value="RINGS">RINGS</option>
                  <option value="BRACELET">BRACELET</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Price</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500"
                  placeholder="∞"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Stock</label>
                <input
                  type="number"
                  value={filters.minStock}
                  onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500"
                  placeholder="0"
                />
              </div>
            </>
          )}
          
          {currentTab === 'users' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-span-3" />
            </>
          )}

          {['contact', 'orders'].includes(currentTab) && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500"
                />
              </div>
            </>
          )}
        </div>

        {hasActiveFilters && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Showing {(() => {
                switch(activeTab) {
                  case 'products': return filteredProducts.length;
                  case 'users': return filteredUsers.length;
                  case 'categories': return filteredCategories.length;
                  case 'contact': return filteredContacts.length;
                  case 'orders': return filteredOrders.length;
                  default: return 0;
                }
              })()} of {(() => {
                switch(activeTab) {
                  case 'products': return products.length;
                  case 'users': return users.length;
                  case 'categories': return categories.length;
                  case 'contact': return contacts.length;
                  case 'orders': return orders.length;
                  default: return 0;
                }
              })()} {activeTab}{' '}
              <button
                onClick={clearFilters}
                className="underline hover:no-underline"
              >
                Clear all filters
              </button>
            </p>
          </div>
        )}
      </div>
    );
  };

  // UNIVERSAL PAGINATION COMPONENT - Works for all sections
  const PaginationControls = ({ currentPage, totalPages, onPageChange, itemCount, totalCount }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span> | 
          Showing: <span className="font-semibold">{itemCount}</span> | Total: <span className="font-semibold">{totalCount}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronLeft className="w-4 h-4" /> Previous
          </button>
          
          {/* Page number buttons */}
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pageNum === currentPage
                        ? 'bg-rose-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <span key={pageNum} className="px-2 py-2">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderProductsTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="text-lg text-gray-500">Loading products...</div>
        </div>
      );
    }
    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            {searchInput !== '' || Object.values(filters).some(f => f !== '') 
              ? 'No products match your filters' 
              : 'No products found'}
          </p>
          <button
            onClick={fetchData}
            className="bg-rose-500 text-white px-4 py-2 rounded hover:bg-rose-600"
          >
            Refresh
          </button>
        </div>
      );
    }
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Category</th>
                <th className="px-6 py-3 font-medium text-gray-500">Price</th>
                <th className="px-6 py-3 font-medium text-gray-500">Stock</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedProducts.map((product) => (
                <tr key={product._id || Math.random()}>
                  <td className="px-6 py-4">{product.name || 'Unnamed Product'}</td>
                  <td className="px-6 py-4">{product.category || 'N/A'}</td>
                  <td className="px-6 py-4">INR {product.price || 0}</td>
                  <td className="px-6 py-4">{product.stock || 0}</td>
                  <td className="px-6 py-4 flex gap-4">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPagesProducts}
          itemCount={paginatedProducts.length}
          totalCount={filteredProducts.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  const renderUsersTable = () => {
    if (loading) return <div className="flex justify-center py-12">Loading users...</div>;
    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            {searchInput !== '' || Object.values(filters).some(f => f !== '') 
              ? 'No users match your filters' 
              : 'No users found'}
          </p>
        </div>
      );
    }
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 font-medium text-gray-500">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user._id || Math.random()}>
                  <td className="px-6 py-4">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4">{user.role || 'user'}</td>
                  <td className="px-6 py-4">{user.phone || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPagesUsers}
          itemCount={paginatedUsers.length}
          totalCount={filteredUsers.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  const renderCategoriesTable = () => {
    if (loading)
      return <div className="flex justify-center py-12">Loading categories...</div>;
    if (filteredCategories.length === 0)
      return <div className="text-center py-12 text-gray-500">No categories found</div>;
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-serif text-lg">Categories</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedCategories.map((cat) => (
                <tr key={cat._id || Math.random()}>
                  <td className="px-6 py-4">{cat.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleCategoryDelete(cat._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPagesCategories}
          itemCount={paginatedCategories.length}
          totalCount={filteredCategories.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  const renderCouponsTable = () => {
    if (loading) {
      return <div className="flex justify-center py-12">Loading coupons...</div>;
    }
    if (filteredCoupons.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {searchInput !== '' || Object.values(filters).some((f) => f !== '')
            ? 'No coupons match your filters'
            : 'No coupons found'}
        </div>
      );
    }
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Code</th>
                <th className="px-6 py-3 font-medium text-gray-500">Type</th>
                <th className="px-6 py-3 font-medium text-gray-500">Value</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Min Order
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">Expiry</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Usage
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Per User
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Restriction
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedCoupons.map((coupon) => (
                <tr key={coupon._id || Math.random()}>
                  <td className="px-6 py-4 font-mono text-sm">
                    {coupon.code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {coupon.discountType}
                    {coupon.isFirstOrderOnly && (
                      <span className="ml-2 text-xs text-rose-500">
                        First order
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `INR ${coupon.discountValue}`}
                  </td>
                  <td className="px-6 py-4">
                    {coupon.minOrderValue ? `INR ${coupon.minOrderValue}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {coupon.expiryDate
                      ? new Date(coupon.expiryDate).toLocaleDateString()
                      : 'No expiry'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {typeof coupon.usageLimit === 'number' &&
                    coupon.usageLimit >= 0
                      ? `${coupon.usageCount || 0} / ${coupon.usageLimit}`
                      : `${coupon.usageCount || 0}`}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {coupon.perUserLimit || 1}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {coupon.allowedUsers && coupon.allowedUsers.length > 0
                      ? coupon.allowedUsers[0].email || 'Specific user'
                      : 'All users'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        coupon.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleCouponEdit(coupon)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleCouponDelete(coupon._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPagesCoupons}
          itemCount={paginatedCoupons.length}
          totalCount={filteredCoupons.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  const renderContactTable = () => {
    if (loading) {
      return <div className="flex justify-center py-12">Loading contacts...</div>;
    }
    if (filteredContacts.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {searchInput !== '' || Object.values(filters).some(f => f !== '') 
            ? 'No contacts match your filters' 
            : 'No contact messages yet.'}
        </div>
      );
    }
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b justify-between items-center flex">
            <h3 className="font-serif text-lg">Contact Messages</h3>
            <button
              onClick={fetchData}
              className="text-sm text-rose-500 hover:underline"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Subject</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Message</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedContacts.map((contact) => (
                  <tr key={contact._id || Math.random()}>
                    <td className="px-6 py-4">{contact.name || 'N/A'}</td>
                    <td className="px-6 py-4">{contact.email || 'N/A'}</td>
                    <td className="px-6 py-4">{contact.subject || '-'}</td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-gray-800">
                        <p className="line-clamp-3">{contact.message || ''}</p>
                        {contact.message && contact.message.length > 120 && (
                          <button
                            type="button"
                            onClick={() => openContactModal(contact)}
                            className="mt-1 text-xs text-rose-500 hover:underline"
                          >
                            View full
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={contact.status || 'New'}
                        onChange={(e) =>
                          handleContactStatusChange(contact._id, e.target.value)
                        }
                        className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-rose-500 focus:border-rose-500"
                      >
                        <option value="New">New</option>
                        <option value="Read">Read</option>
                        <option value="Replied">Replied</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {contact.createdAt
                        ? new Date(contact.createdAt).toLocaleString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPagesContacts}
          itemCount={paginatedContacts.length}
          totalCount={filteredContacts.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  const renderOrdersTable = () => {
    if (loading) {
      return <div className="flex justify-center py-12">Loading orders...</div>;
    }
    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            {searchInput !== '' || Object.values(filters).some(f => f !== '') 
              ? 'No orders match your filters' 
              : 'No orders found.'}
          </p>
        </div>
      );
    }
    return (
      <>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Order ID</th>
                <th className="px-6 py-3 font-medium text-gray-500">User</th>
                <th className="px-6 py-3 font-medium text-gray-500">Products</th>
                <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="px-6 py-3 font-medium text-gray-500">Total</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <tr key={order._id || Math.random()}>
                  <td className="px-6 py-4 font-mono text-sm">
                    {order._id?.substring(0, 8) || 'N/A'}...
                  </td>
                  <td className="px-6 py-4">{order.user?.name || 'Unknown'}</td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={idx} className="text-gray-700">
                            <span className="font-medium">
                              {item.name || item.product?.name || 'Product'}
                            </span>
                            <span className="text-gray-500"> × {item.quantity}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400">No items</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">INR {order.totalPrice || 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'processing'
                          ? 'bg-purple-100 text-purple-700'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : order.status === 'exchange_requested'
                          ? 'bg-orange-100 text-orange-700'
                          : order.status === 'exchange_approved'
                          ? 'bg-teal-100 text-teal-700'
                          : order.status === 'exchanged'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {order.status
                        ? order.status
                            .replace('_', ' ')
                            .split(' ')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')
                        : 'Unknown'}
                    </span>
                    {order.status === 'cancelled' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cancelled from:{' '}
                        {order.cancellationFee > 0 ? 'Processing' : 'Pending'}
                      </p>
                    )}
                    {order.exchangeReason && (
                      <p className="text-xs text-gray-500 mt-1">
                        Reason: {order.exchangeReason.replace('_', ' ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {order.status === 'exchange_requested' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExchangeApproval(order._id, true)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors flex items-center gap-1"
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            onClick={() => handleExchangeApproval(order._id, false)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                          >
                            <FaTimes /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadInvoice(order._id)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Download Invoice"
                          >
                            <FaDownload />
                          </button>
                          {order.status !== 'cancelled' && order.status !== 'exchanged' && (
                            <select
                              value={order.status || 'pending'}
                              onChange={(e) => handleOrderStatus(order._id, e.target.value)}
                              className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-rose-500 focus:border-rose-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          )}
                          <button
                            onClick={() => openOrderEditModal(order)}
                            className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Edit Order Details"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls 
          currentPage={currentPage} 
          totalPages={totalPagesOrders}
          itemCount={paginatedOrders.length}
          totalCount={filteredOrders.length}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </>
    );
  };

  return (
    <div className="container mx-auto px-6 py-24">
      <h1 className="text-4xl font-serif mb-8">Admin Dashboard</h1>

      <div className="flex border-b mb-8 overflow-x-auto">
        {['products', 'users', 'coupons', 'contact', 'orders'].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 font-medium capitalize whitespace-nowrap ${
              activeTab === tab ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-500'
            }`}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <FilterControls />

      {activeTab === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif">Product Management</h2>
            <button
              onClick={() => handleOpenModal()}
              className="bg-rose-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-rose-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <FaPlus /> Add Product
            </button>
          </div>
          {renderProductsTable()}
        </div>
      )}

      {activeTab === 'users' && <div>{renderUsersTable()}</div>}

      {activeTab === 'categories' && <div>{renderCategoriesTable()}</div>}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif">
              {editingCouponId ? 'Edit Coupon' : 'Create Coupon'}
            </h2>
            <button
              onClick={resetCouponForm}
              className="text-sm text-rose-500 hover:underline"
            >
              Clear form
            </button>
          </div>
          <form
            onSubmit={handleCouponSubmit}
            className="bg-white shadow rounded-lg p-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  placeholder="e.g. FIRST10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Type
                </label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      discountType: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Value
                </label>
                <input
                  type="number"
                  value={couponForm.discountValue}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      discountValue: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Order Value
                </label>
                <input
                  type="number"
                  value={couponForm.minOrderValue}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      minOrderValue: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={couponForm.expiryDate}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      expiryDate: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Global Usage Limit
                </label>
                <input
                  type="number"
                  value={couponForm.usageLimit}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      usageLimit: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Per-User Usage Limit
                </label>
                <input
                  type="number"
                  value={couponForm.perUserLimit}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      perUserLimit: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Restrict To User (Email)
                </label>
                <input
                  type="email"
                  value={couponForm.restrictedToUserEmail}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      restrictedToUserEmail: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-center gap-6 mt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={couponForm.isActive}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-rose-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={couponForm.isFirstOrderOnly}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        isFirstOrderOnly: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-rose-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    First-order only
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={resetCouponForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors"
              >
                {editingCouponId ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </form>

          {renderCouponsTable()}
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif">Contact Management</h2>
          </div>
          {renderContactTable()}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif">Order Management</h2>
            <button
              onClick={fetchData}
              className="text-sm text-rose-500 hover:underline"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          {renderOrdersTable()}
        </div>
      )}

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white p-8 rounded-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <FaTimes />
            </button>
            <h2 className="text-2xl font-serif mb-6">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="NECKLACE">NECKLACE</option>
                  <option value="EARRINGS">EARRINGS</option>
                  <option value="RINGS">RINGS</option>
                  <option value="BRACELET">BRACELET</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Images
                </label>
                <div className="flex gap-2 mb-2">
                   <input
                     type="file"
                     accept="image/*"
                     onChange={uploadFileHandler}
                     className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-rose-50 file:text-rose-700
                       hover:file:bg-rose-100"
                   />
                   {uploading && <span className="text-sm text-gray-500 self-center">Uploading...</span>}
                </div>
                
                {formData.images && formData.images.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {formData.images.map((img, index) => {
                      if (!img) return null;
                      return (
                        <div key={index} className="relative w-24 h-24 flex-shrink-0 border rounded-lg overflow-hidden bg-gray-100">
                          <img 
                            src={img} 
                            alt={`Preview ${index}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style Collections
                </label>
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 border rounded-lg bg-gray-50">
                  {['minimalist', 'boho', 'everyday', 'accent'].map((style) => (
                    <label key={style} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedStyles.includes(style)}
                        onChange={(e) => {
                          const newStyles = e.target.checked
                            ? [...formData.selectedStyles, style]
                            : formData.selectedStyles.filter((s) => s !== style);
                          setFormData({ ...formData, selectedStyles: newStyles });
                        }}
                        className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {style === 'boho' ? 'Boho Vibes' : 
                         style === 'everyday' ? 'Everyday Essentials' : 
                         style === 'accent' ? 'Accent Pairs' : style}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paired Products (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.accentPairs}
                  onChange={(e) => setFormData({ ...formData, accentPairs: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Golden Hoop, Silver Ring..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-rose-500 focus:border-rose-500"
                  rows="3"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeContactModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-serif mb-4">Contact Message</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Name: </span>
                {selectedContact.name || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Email: </span>
                {selectedContact.email || 'N/A'}
              </p>
              {selectedContact.subject && (
                <p>
                  <span className="font-semibold">Subject: </span>
                  {selectedContact.subject}
                </p>
              )}
              <p>
                <span className="font-semibold">Status: </span>
                {selectedContact.status || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Created: </span>
                {selectedContact.createdAt
                  ? new Date(selectedContact.createdAt).toLocaleString()
                  : 'N/A'}
              </p>
              <div className="mt-4">
                <p className="font-semibold mb-1">Message:</p>
                <p className="whitespace-pre-wrap">
                  {selectedContact.message || ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOrderModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
          <div className="bg-white p-8 rounded-lg w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <FaTimes />
            </button>
            <h2 className="text-2xl font-serif mb-6">Edit Order</h2>
            
            <form onSubmit={handleUpdateOrder} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3 text-gray-700">Shipping Address</h3>
                <div className="space-y-3">
                  <textarea
                    placeholder="House/Flat No., Building Name, Street, Area"
                    value={orderForm.shippingAddress.street}
                    onChange={(e) => setOrderForm({
                      ...orderForm,
                      shippingAddress: { ...orderForm.shippingAddress, street: e.target.value }
                    })}
                    className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                    rows="2"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={orderForm.shippingAddress.city}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, city: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State/Province"
                      value={orderForm.shippingAddress.state}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, state: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="PIN/ZIP Code"
                      value={orderForm.shippingAddress.postalCode}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, postalCode: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={orderForm.shippingAddress.country}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, country: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={orderForm.shippingAddress.phone}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, phone: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Landmark (Optional)"
                      value={orderForm.shippingAddress.landmark}
                      onChange={(e) => setOrderForm({
                        ...orderForm,
                        shippingAddress: { ...orderForm.shippingAddress, landmark: e.target.value }
                      })}
                      className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Status
                </label>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                  className="w-full border p-2 rounded focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="exchange_requested">Exchange Requested</option>
                  <option value="exchange_approved">Exchange Approved</option>
                  <option value="exchanged">Exchanged</option>
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3 text-gray-700">Order Items</h3>
                <div className="space-y-4">
                  {orderForm.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-white p-3 rounded border">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Product</label>
                        <select
                          value={item.product || ''}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].product = e.target.value;
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded text-sm"
                        >
                          <option value="">Select Product</option>
                          {allProducts.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = orderForm.items.filter((_, i) => i !== index);
                          setOrderForm({ ...orderForm, items: newItems });
                        }}
                        className="mt-5 text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOrderForm({
                      ...orderForm,
                      items: [...orderForm.items, { product: '', quantity: 1 }]
                    })}
                    className="text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <FaPlus className="text-xs" /> Add Item
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
