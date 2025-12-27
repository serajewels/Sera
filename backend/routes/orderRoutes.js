const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, totalPrice } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
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

  // All validations passed - now update stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } }
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
    shippingAddress,
    totalPrice,
    status: 'pending'
  });

  const createdOrder = await order.save();

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

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product._id,
      { $inc: { stock: item.quantity } }
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

module.exports = router;
