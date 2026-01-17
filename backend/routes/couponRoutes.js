const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

router.get(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  })
);

router.post(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      expiryDate,
      usageLimit,
      isActive,
      firstOrderOnly
    } = req.body;

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      res.status(400);
      throw new Error('Coupon code already exists');
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      minOrderValue,
      expiryDate,
      usageLimit,
      isActive,
      firstOrderOnly
    });

    res.status(201).json(coupon);
  })
);

router.put(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      expiryDate,
      usageLimit,
      isActive,
      firstOrderOnly
    } = req.body;

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      const existing = await Coupon.findOne({
        code: normalizedCode,
        _id: { $ne: coupon._id }
      });
      if (existing) {
        res.status(400);
        throw new Error('Another coupon with this code already exists');
      }
      coupon.code = normalizedCode;
    }

    if (discountType) {
      coupon.discountType = discountType;
    }
    if (typeof discountValue === 'number') {
      coupon.discountValue = discountValue;
    }
    if (typeof minOrderValue === 'number') {
      coupon.minOrderValue = minOrderValue;
    }
    if (expiryDate) {
      coupon.expiryDate = expiryDate;
    }
    if (typeof usageLimit === 'number') {
      coupon.usageLimit = usageLimit;
    }
    if (typeof isActive === 'boolean') {
      coupon.isActive = isActive;
    }
    if (typeof firstOrderOnly === 'boolean') {
      coupon.firstOrderOnly = firstOrderOnly;
    }

    const updated = await coupon.save();
    res.json(updated);
  })
);

router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }
    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted' });
  })
);

router.post(
  '/validate',
  protect,
  asyncHandler(async (req, res) => {
    const { code, orderTotal } = req.body;

    if (!code) {
      res.status(400);
      throw new Error('Coupon code is required');
    }

    const total = parseFloat(orderTotal);
    if (!Number.isFinite(total) || total <= 0) {
      res.status(400);
      throw new Error('Invalid order total');
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      res.status(400);
      throw new Error('Invalid coupon code');
    }

    if (!coupon.isActive) {
      res.status(400);
      throw new Error('This coupon is not active');
    }

    const now = new Date();
    if (coupon.expiryDate && coupon.expiryDate < now) {
      res.status(400);
      throw new Error('This coupon has expired');
    }

    if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      res.status(400);
      throw new Error('This coupon has reached its usage limit');
    }

    if (coupon.minOrderValue && total < coupon.minOrderValue) {
      res.status(400);
      throw new Error(
        `Minimum order value of ${coupon.minOrderValue} is required to use this coupon`
      );
    }

    if (coupon.firstOrderOnly) {
      const hasOrder = await Order.exists({
        user: req.user._id
      });
      if (hasOrder) {
        res.status(400);
        throw new Error('This coupon is only valid on your first order');
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

    res.json({
      valid: true,
      couponId: coupon._id,
      code: coupon.code,
      discountAmount,
      finalAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      firstOrderOnly: coupon.firstOrderOnly
    });
  })
);

module.exports = router;
