const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');


// @desc    Create new order
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

  let appliedCoupon = null;
  let finalTotalPrice = totalPrice;
  let couponDiscount = 0;

  if (couponCode) {
    const normalizedCode = couponCode.toUpperCase().trim();

    // ✅ ATOMIC: Check AND increment coupon usage in one operation
    const coupon = await Coupon.findOneAndUpdate(
      {
        code: normalizedCode,
        isActive: true,
        // Check expiry date
        $or: [
          { expiryDate: null },
          { expiryDate: { $gte: new Date() } }
        ],
        // Check usage limit
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
        ]
      },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      res.status(400);
      throw new Error('Invalid, expired, or usage limit reached for coupon');
    }

    // ✅ VALIDATE MINIMUM ORDER VALUE
    if (coupon.minOrderValue && totalPrice < coupon.minOrderValue) {
      // Rollback: decrement usage count since this order will fail
      await Coupon.findByIdAndUpdate(
        coupon._id,
        { $inc: { usageCount: -1 } }
      );
      res.status(400);
      throw new Error(
        `Minimum order value for this coupon is INR ${coupon.minOrderValue}`
      );
    }

    // ✅ VALIDATE ALLOWED USERS
    if (
      coupon.allowedUsers &&
      coupon.allowedUsers.length > 0 &&
      !coupon.allowedUsers.some(
        (u) => u.toString() === req.user._id.toString()
      )
    ) {
      // Rollback: decrement usage count
      await Coupon.findByIdAndUpdate(
        coupon._id,
        { $inc: { usageCount: -1 } }
      );
      res.status(400);
      throw new Error('This coupon is not valid for your account');
    }

    // ✅ VALIDATE FIRST ORDER ONLY
    const userOrderCount = await Order.countDocuments({ user: req.user._id });

    if (coupon.isFirstOrderOnly) {
      if (userOrderCount > 0) {
        // Rollback: decrement usage count
        await Coupon.findByIdAndUpdate(
          coupon._id,
          { $inc: { usageCount: -1 } }
        );
        res.status(400);
        throw new Error('This coupon is only valid on your first order');
      }
    }

    // ✅ VALIDATE PER USER LIMIT
    if (coupon.perUserLimit && coupon.perUserLimit > 0) {
      const userCouponUsage = await Order.countDocuments({
        user: req.user._id,
        couponCode: coupon.code,
      });

      if (userCouponUsage >= coupon.perUserLimit) {
        // Rollback: decrement usage count
        await Coupon.findByIdAndUpdate(
          coupon._id,
          { $inc: { usageCount: -1 } }
        );
        res.status(400);
        throw new Error('You have already used this coupon the maximum number of times');
      }
    }

    // ✅ CALCULATE DISCOUNT
    if (coupon.discountType === 'percentage') {
      couponDiscount = (totalPrice * coupon.discountValue) / 100;
    } else {
      couponDiscount = coupon.discountValue;
    }

    if (couponDiscount > totalPrice) {
      couponDiscount = totalPrice;
    }

    finalTotalPrice = totalPrice - couponDiscount;
    appliedCoupon = coupon;
  }

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
    totalPrice: finalTotalPrice,
    couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    couponDiscount,
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


// @desc    Generate invoice PDF for an order
// @route   GET /api/orders/:id/invoice
// @access  Private (user or admin)
router.get('/:id/invoice', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (req.user.role !== 'admin' && !order.user._id.equals(req.user._id)) {
    res.status(401);
    throw new Error('Not authorized to view this invoice');
  }

  const doc = new PDFDocument({ margin: 50 });

  const invoiceNo = order.invoiceNumber || `INV-${order._id.toString().slice(-8)}`;
  const fileName = `Invoice-${invoiceNo}.pdf`;
  const invoiceDate = new Date(order.createdAt);
  const formatAmount = (value) => Number((Number(value || 0)).toFixed(1));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

  doc.pipe(res);

  const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo.png');
  const hasLogo = fs.existsSync(logoPath);

  if (hasLogo) {
    doc.image(logoPath, 400, 40, { fit: [120, 120], align: 'right' });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('ORDER SUMMARY', 50, 50);

  doc
    .font('Helvetica')
    .fontSize(11)
    .moveDown(0.5)
    .text('Sera Jewellery', 50, 80);

  doc
    .fontSize(10)
    .text(`Invoice No: ${invoiceNo}`, 50, 98)
    .text(`Date: ${invoiceDate.toLocaleDateString()}`, 50, 110)
    .moveDown(1.5);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Billed To:')
    .moveDown(0.3);

  doc
    .font('Helvetica')
    .fontSize(10)
    .text(order.user?.name || 'Customer')
    .text(order.shippingAddress.street || '')
    .text(
      `${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}`
    )
    .text(
      `${order.shippingAddress.postalCode || ''}, ${
        order.shippingAddress.country || 'India'
      }`
    )
    .text(order.shippingAddress.phone || '')
    .moveDown(1.5);

  const tableTop = doc.y + 10;

  const itemX = 50;
  const qtyX = 280;
  const priceX = 340;
  const totalX = 430;

  doc.fontSize(10).text('Item', itemX, tableTop);
  doc.text('Qty', qtyX, tableTop);
  doc.text('Price', priceX, tableTop);
  doc.text('Total', totalX, tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let currentY = tableTop + 25;

  order.items.forEach((item) => {
    const name = item.name || item.product?.name || 'Product';
    const quantity = item.quantity || 1;
    const priceRaw = item.price || item.product?.price || 0;
    const lineTotalRaw = priceRaw * quantity;
    const price = formatAmount(priceRaw);
    const lineTotal = formatAmount(lineTotalRaw);

    doc.text(name, itemX, currentY, { width: 200 });
    doc.text(String(quantity), qtyX, currentY);
    doc.text(`INR ${price}`, priceX, currentY);
    doc.text(`INR ${lineTotal}`, totalX, currentY);

    currentY += 18;
  });

  doc.moveDown(2);

  const summaryY = currentY + 10;

  const subtotalRaw = order.items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const shippingRawBase =
    subtotalRaw > 999 ? 0 : subtotalRaw > 0 ? 100 : 0;
  const discountRaw = order.couponDiscount || 0;
  const grandTotalRaw =
    typeof order.totalPrice === 'number'
      ? order.totalPrice
      : subtotalRaw + shippingRawBase - discountRaw;

  const subtotal = formatAmount(subtotalRaw);
  const discount = formatAmount(discountRaw);
  const grandTotal = formatAmount(grandTotalRaw);
  const shippingAmount = formatAmount(shippingRawBase);

  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`Subtotal: INR ${subtotal}`, totalX - 50, summaryY, {
      align: 'right',
    });

  const shippingLabel =
    shippingAmount > 0 ? `Shipping: INR ${shippingAmount}` : 'Shipping: Free';

  doc.text(shippingLabel, totalX - 50, summaryY + 15, {
    align: 'right',
  });

  if (discountRaw > 0) {
    const discountLabel = order.couponCode
      ? `Discount (${order.couponCode})`
      : 'Discount';
    doc.text(
      `${discountLabel}: - INR ${discount}`,
      totalX - 50,
      summaryY + 30,
      {
        align: 'right',
      }
    );
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`Total: INR ${grandTotal}`, totalX - 50, summaryY + (discountRaw > 0 ? 50 : 30), {
      align: 'right',
    });

  doc
    .moveDown(3)
    .font('Helvetica')
    .fontSize(9)
    .text(
      'Thank you for shopping with Sera Jewellery.',
      50,
      doc.y + 20,
      {
        align: 'center',
      }
    );

  doc.end();
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

  // ✅ RESTORE COUPON USAGE COUNT on cancellation
  if (order.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: order.couponCode },
      { $inc: { usageCount: -1 } }
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


module.exports = router;