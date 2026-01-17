const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
});

const validateCouponForOrder = async (userId, orderTotal, code) => {
  if (!code) {
    return {
      coupon: null,
      discountAmount: 0,
      finalAmount: orderTotal
    };
  }

  const total = parseFloat(orderTotal);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      error: 'Invalid order total for coupon'
    };
  }

  const normalizedCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    return {
      error: 'Invalid coupon code'
    };
  }

  if (!coupon.isActive) {
    return {
      error: 'This coupon is not active'
    };
  }

  const now = new Date();
  if (coupon.expiryDate && coupon.expiryDate < now) {
    return {
      error: 'This coupon has expired'
    };
  }

  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return {
      error: 'This coupon has reached its usage limit'
    };
  }

  if (coupon.minOrderValue && total < coupon.minOrderValue) {
    return {
      error: `Minimum order value of ${coupon.minOrderValue} is required to use this coupon`
    };
  }

  if (coupon.firstOrderOnly) {
    const hasOrder = await Order.exists({
      user: userId
    });
    if (hasOrder) {
      return {
        error: 'This coupon is only valid on your first order'
      };
    }
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (total * coupon.discountValue) / 100;
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  }

  if (discountAmount > total) {
    discountAmount = total;
  }

  const finalAmount = total - discountAmount;

  return {
    coupon,
    discountAmount,
    finalAmount
  };
};

// @desc    Create new order (COD or non-Razorpay)
// @route   POST /api/orders
// @access  Private
router.post('/', protect, asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, totalPrice, couponCode } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // ✅ VALIDATE SHIPPING ADDRESS
  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
      !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.phone) {
    res.status(400);
    throw new Error('Complete shipping address is required');
  }

  // Validate stock for all items FIRST
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      res.status(404);
      throw new Error(`Product not found`);
    }
    
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} items available`);
    }
  }

  const baseTotal = parseFloat(totalPrice);
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
    res.status(400);
    throw new Error('Invalid total price');
  }

  const couponResult = await validateCouponForOrder(req.user._id, baseTotal, couponCode);
  if (couponResult.error) {
    res.status(400);
    throw new Error(couponResult.error);
  }

  const finalTotal = couponResult.finalAmount;

  // All validations passed - now update stock and sales
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity, sales: item.quantity } }
    );
  }

  // Create the order
  const order = new Order({
    user: req.user._id,
    items: orderItems.map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price
    })),
    shippingAddress: {
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone,
      landmark: shippingAddress.landmark || ''
    },
    totalPrice: finalTotal,
    status: 'pending'
  });

  const createdOrder = await order.save();

  if (couponResult.coupon) {
    await Coupon.findByIdAndUpdate(couponResult.coupon._id, {
      $inc: { usageCount: 1 }
    });
    createdOrder.couponCode = couponResult.coupon.code;
    createdOrder.couponDiscountAmount = couponResult.discountAmount;
    createdOrder.couponId = couponResult.coupon._id;
    await createdOrder.save();
  }

  // Clear the user's cart
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [] }
  );

  res.status(201).json(createdOrder);
}));

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json(orders);
}));

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product');

  if (order) {
    if (req.user.role === 'admin' || order.user._id.equals(req.user._id)) {
      res.json(order);
    } else {
      res.status(401);
      throw new Error('Not authorized to view this order');
    }
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
}));

// @desc    Get all orders (Admin)
// @route   GET /api/orders/all/admin
// @access  Private/Admin
router.get('/all/admin', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
  
  const orders = await Order.find({})
    .populate('user', 'id name email')
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json(orders);
}));

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
  
  const order = await Order.findById(req.params.id);
  
  if (order) {
    const oldStatus = order.status;
    order.status = req.body.status || order.status;
    
    // Mark delivered date
    if (order.status === 'delivered' && oldStatus !== 'delivered') {
      order.deliveredAt = new Date();
    }
    
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
}));

// @desc    Cancel order (User or Admin)
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized to cancel this order');
  }

  // Cannot cancel after shipped
  if (order.status === 'shipped' || order.status === 'delivered') {
    res.status(400);
    throw new Error('Cannot cancel order after it has been shipped. Please use exchange option if delivered.');
  }

  if (order.status === 'cancelled') {
    res.status(400);
    throw new Error('Order is already cancelled');
  }

  // Calculate cancellation fee
  let cancellationFee = 0;
  if (order.status === 'processing') {
    cancellationFee = 100;
  }

  // Restore product stock and decrease sales count
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product._id,
      { $inc: { stock: item.quantity, sales: -item.quantity } }
    );
  }

  order.status = 'cancelled';
  order.cancellationFee = cancellationFee;
  order.refundAmount = order.totalPrice - cancellationFee;
  const updatedOrder = await order.save();

  res.json(updatedOrder);
}));

// @desc    Request exchange (User only - within 3 days of delivery)
// @route   PUT /api/orders/:id/exchange
// @access  Private
router.put('/:id/exchange', protect, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id).populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check authorization - only order owner
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to exchange this order');
  }

  // Can only exchange delivered orders
  if (order.status !== 'delivered') {
    res.status(400);
    throw new Error('Can only exchange delivered orders');
  }

  // Check if within 3 days of delivery
  const deliveryDate = order.deliveredAt || order.updatedAt;
  const daysSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24);
  
  if (daysSinceDelivery > 3) {
    res.status(400);
    throw new Error('Exchange window expired. You can only exchange within 3 days of delivery.');
  }

  // Calculate exchange fee
  let exchangeFee = 100;
  if (reason === 'damaged' || reason === 'defective') {
    exchangeFee = 0; // Free exchange for damaged/defective items
  }

  order.status = 'exchange_requested';
  order.exchangeReason = reason;
  order.exchangeFee = exchangeFee;
  const updatedOrder = await order.save();

  res.json(updatedOrder);
}));

// @desc    Approve/Reject exchange (Admin)
// @route   PUT /api/orders/:id/exchange/approve
// @access  Private/Admin
router.put('/:id/exchange/approve', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }

  const { approved } = req.body;
  const order = await Order.findById(req.params.id).populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status !== 'exchange_requested') {
    res.status(400);
    throw new Error('No exchange request found for this order');
  }

  if (approved) {
    order.status = 'exchange_approved';
    
    // Restore stock for old items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: item.quantity } }
      );
    }
  } else {
    // Rejected - back to delivered
    order.status = 'delivered';
    order.exchangeReason = null;
    order.exchangeFee = 0;
  }

  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

// @desc    Update order details (Admin)
// @route   PUT /api/orders/:id/update
// @access  Private/Admin
router.put('/:id/update', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    // ✅ UPDATE SHIPPING ADDRESS WITH VALIDATION
    if (req.body.shippingAddress) {
      order.shippingAddress = {
        street: req.body.shippingAddress.street || order.shippingAddress.street,
        city: req.body.shippingAddress.city || order.shippingAddress.city,
        state: req.body.shippingAddress.state || order.shippingAddress.state,
        postalCode: req.body.shippingAddress.postalCode || order.shippingAddress.postalCode,
        country: req.body.shippingAddress.country || order.shippingAddress.country,
        phone: req.body.shippingAddress.phone || order.shippingAddress.phone,
        landmark: req.body.shippingAddress.landmark || order.shippingAddress.landmark || ''
      };
    }

    // Update status with side effects handling
    if (req.body.status && req.body.status !== order.status) {
      const oldStatus = order.status;
      order.status = req.body.status;
      
      // Mark delivered date
      if (order.status === 'delivered' && oldStatus !== 'delivered') {
        order.deliveredAt = new Date();
      }
    }

    // Update items and stock
    if (req.body.items && Array.isArray(req.body.items)) {
      // Map old items for quick lookup
      const oldItemsMap = {};
      order.items.forEach(item => {
        if (item.product) {
            oldItemsMap[item.product.toString()] = item.quantity;
        }
      });

      const newItemsProcessed = [];
      let runningTotalPrice = 0;

      // Validate new items and check stock
      for (const item of req.body.items) {
        if (!item.product) continue; // Skip invalid items
        
        const product = await Product.findById(item.product);
        if (!product) {
          res.status(404);
          throw new Error(`Product not found: ${item.product}`);
        }
        
        // Calculate available stock considering what we already hold in the order
        const oldQty = oldItemsMap[product._id.toString()] || 0;
        const availableStock = product.stock + oldQty;
        
        if (availableStock < item.quantity) {
          res.status(400);
          throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
        }
        
        newItemsProcessed.push({
          product: product._id,
          name: product.name,
          quantity: Number(item.quantity),
          price: product.price // Update price to current product price
        });
        runningTotalPrice += product.price * item.quantity;
      }

      // If validation passes, apply stock changes
      
      // 1. Restore stock for ALL old items
      for (const item of order.items) {
        if (item.product) {
            await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity, sales: -item.quantity }
            });
        }
      }

      // 2. Deduct stock for ALL new items
      for (const item of newItemsProcessed) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity, sales: item.quantity }
        });
      }

      order.items = newItemsProcessed;
      order.totalPrice = runningTotalPrice; // Recalculate total price
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
}));

// @desc    Create Razorpay order and local order
// @route   POST /api/orders/razorpay/create
// @access  Private
router.post('/razorpay/create', protect, asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, orderTotal, couponCode } = req.body;

  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
      !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.phone) {
    res.status(400);
    throw new Error('Complete shipping address is required');
  }

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} items available`);
    }
  }

  const baseTotal = parseFloat(orderTotal);
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
    res.status(400);
    throw new Error('Invalid order total');
  }

  const couponResult = await validateCouponForOrder(req.user._id, baseTotal, couponCode);
  if (couponResult.error) {
    res.status(400);
    throw new Error(couponResult.error);
  }

  const finalTotal = couponResult.finalAmount;

  for (const item of orderItems) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity, sales: item.quantity } }
    );
  }

  const order = new Order({
    user: req.user._id,
    items: orderItems.map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price
    })),
    shippingAddress: {
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone,
      landmark: shippingAddress.landmark || ''
    },
    totalPrice: finalTotal,
    status: 'pending',
    paymentMethod: 'upi',
    paymentStatus: 'pending'
  });

  if (couponResult.coupon) {
    order.couponCode = couponResult.coupon.code;
    order.couponDiscountAmount = couponResult.discountAmount;
    order.couponId = couponResult.coupon._id;
  }

  const createdOrder = await order.save();

  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [] }
  );

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalTotal * 100),
      currency: 'INR',
      receipt: `order_${createdOrder._id}`,
      notes: {
        orderId: String(createdOrder._id),
        userId: String(req.user._id),
        couponCode: order.couponCode || ''
      }
    });
  } catch (error) {
    createdOrder.paymentStatus = 'failed';
    await createdOrder.save();
    res.status(500);
    throw new Error('Failed to create Razorpay order');
  }

  createdOrder.razorpayOrderId = razorpayOrder.id;
  await createdOrder.save();

  res.json({
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
    orderId: createdOrder._id,
    amount: finalTotal,
    currency: 'INR',
    razorpayOrderId: razorpayOrder.id
  });
}));

// @desc    Verify Razorpay payment and update order
// @route   POST /api/orders/razorpay/verify
// @access  Private
router.post('/razorpay/verify', protect, asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing Razorpay payment details');
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    order.razorpayOrderId = razorpay_order_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    await order.save();
    res.status(400);
    throw new Error('Payment verification failed');
  }

  order.paymentStatus = 'paid';
  if (order.status === 'pending') {
    order.status = 'processing';
  }
  order.razorpayOrderId = razorpay_order_id;
  order.razorpayPaymentId = razorpay_payment_id;
  order.razorpaySignature = razorpay_signature;

  if (order.couponId) {
    await Coupon.findByIdAndUpdate(order.couponId, {
      $inc: { usageCount: 1 }
    });
  }

  const user = await User.findById(order.user);

  try {
    const invoice = await razorpay.invoices.create({
      type: 'invoice',
      customer: {
        name: user ? user.name : '',
        email: user ? user.email : '',
        contact: order.shippingAddress ? order.shippingAddress.phone : ''
      },
      line_items: [
        {
          name: `Order ${order._id}`,
          amount: Math.round(order.totalPrice * 100),
          currency: 'INR',
          quantity: 1
        }
      ],
      receipt: `order_${order._id}`
    });

    order.razorpayInvoiceId = invoice.id;
    order.razorpayInvoiceUrl = invoice.short_url || invoice.invoice_url || '';
  } catch (error) {
    console.error('Razorpay invoice creation failed', error);
  }

  const updatedOrder = await order.save();

  res.json({
    success: true,
    order: updatedOrder
  });
}));

module.exports = router;
