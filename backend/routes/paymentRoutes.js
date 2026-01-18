const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

router.post(
  '/create-order',
  protect,
  asyncHandler(async (req, res) => {
    const { amount, currency, receipt } = req.body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      res.status(500);
      throw new Error('Razorpay keys are not configured');
    }

    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error('Valid amount is required');
    }

    const orderPayload = {
      amount: Math.round(amount),
      currency: currency || 'INR',
      receipt:
        receipt ||
        `rcpt_${Date.now()}_${req.user._id.toString().slice(
          -6
        )}`,
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString(
      'base64'
    );

    const { data } = await axios.post(
      'https://api.razorpay.com/v1/orders',
      orderPayload,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      keyId,
    });
  })
);

router.post(
  '/verify-payment',
  protect,
  asyncHandler(async (req, res) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderItems,
      shippingAddress,
      totalAmount,
      couponCode,
      discountAmount,
    } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      res.status(500);
      throw new Error('Razorpay key secret is not configured');
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      res.status(400);
      throw new Error('Payment details are incomplete');
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400);
      throw new Error('Payment signature verification failed');
    }

    if (
      !orderItems ||
      !Array.isArray(orderItems) ||
      orderItems.length === 0
    ) {
      res.status(400);
      throw new Error('No order items provided');
    }

    if (
      !shippingAddress ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode ||
      !shippingAddress.phone
    ) {
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
        throw new Error(
          `Insufficient stock for ${product.name}. Only ${product.stock} items available`
        );
      }
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sales: item.quantity },
      });
    }

    const order = new Order({
      user: req.user._id,
      items: orderItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
        phone: shippingAddress.phone,
        landmark: shippingAddress.landmark || '',
      },
      totalPrice: totalAmount,
      status: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      invoiceNumber: `INV-${Date.now()}`,
      couponCode: couponCode || undefined,
      couponDiscount: discountAmount || 0,
    });

    const createdOrder = await order.save();

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [] }
    );

    res.json({
      success: true,
      order: createdOrder,
    });
  })
);

module.exports = router;
