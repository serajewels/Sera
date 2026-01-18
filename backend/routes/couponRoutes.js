const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, admin } = require('../middleware/authMiddleware');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Order = require('../models/Order');


// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
// @access  Private/Admin
router.get(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find({})
      .populate('allowedUsers', 'email')
      .sort({ createdAt: -1 });
    res.json(coupons);
  })
);


// @desc    Create coupon (Admin)
// @route   POST /api/coupons
// @access  Private/Admin
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
      perUserLimit,
      isActive,
      isFirstOrderOnly,
      restrictedToUserEmail,
      description,
    } = req.body;


    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      res.status(400);
      throw new Error('Coupon code already exists');
    }


    let allowedUsers = [];
    if (restrictedToUserEmail) {
      const user = await User.findOne({
        email: restrictedToUserEmail.toLowerCase().trim(),
      });
      if (!user) {
        res.status(400);
        throw new Error('Restricted user not found');
      }
      allowedUsers = [user._id];
    }


    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      expiryDate: expiryDate || null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      isFirstOrderOnly: Boolean(isFirstOrderOnly),
      allowedUsers,
      description,
    });


    const created = await coupon.populate('allowedUsers', 'email');
    res.status(201).json(created);
  })
);


// @desc    Update coupon (Admin)
// @route   PUT /api/coupons/:id
// @access  Private/Admin
router.put(
  '/:id',
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
      perUserLimit,
      isActive,
      isFirstOrderOnly,
      restrictedToUserEmail,
      description,
    } = req.body;


    const coupon = await Coupon.findById(req.params.id);


    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }


    if (code && code.toUpperCase().trim() !== coupon.code) {
      const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (existing) {
        res.status(400);
        throw new Error('Another coupon with this code already exists');
      }
      coupon.code = code.toUpperCase().trim();
    }


    if (discountType) coupon.discountType = discountType;
    if (typeof discountValue === 'number') coupon.discountValue = discountValue;
    if (typeof minOrderValue === 'number') coupon.minOrderValue = minOrderValue;
    coupon.expiryDate = expiryDate || null;
    coupon.usageLimit = typeof usageLimit === 'number' ? usageLimit : coupon.usageLimit;
    coupon.perUserLimit =
      typeof perUserLimit === 'number' && perUserLimit > 0
        ? perUserLimit
        : coupon.perUserLimit;
    if (typeof isActive === 'boolean') coupon.isActive = isActive;
    if (typeof isFirstOrderOnly === 'boolean') {
      coupon.isFirstOrderOnly = isFirstOrderOnly;
    }
    if (typeof description === 'string') {
      coupon.description = description;
    }


    if (restrictedToUserEmail !== undefined) {
      if (restrictedToUserEmail) {
        const user = await User.findOne({
          email: restrictedToUserEmail.toLowerCase().trim(),
        });
        if (!user) {
          res.status(400);
          throw new Error('Restricted user not found');
        }
        coupon.allowedUsers = [user._id];
      } else {
        coupon.allowedUsers = [];
      }
    }


    const updated = await coupon.save();
    const populated = await updated.populate('allowedUsers', 'email');
    res.json(populated);
  })
);


// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
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
    res.json({ message: 'Coupon removed' });
  })
);


// @desc    Validate coupon for current user and cart value
// @route   POST /api/coupons/validate
// @access  Private
// ✅ UPDATED: Now accepts cartValue (excluding shipping) separately from orderTotal
router.post(
  '/validate',
  protect,
  asyncHandler(async (req, res) => {
    const { code, cartValue, orderTotal } = req.body;

    // ✅ VALIDATION: Require both cartValue and orderTotal
    if (!code || cartValue === undefined || orderTotal === undefined) {
      res.status(400);
      throw new Error('Coupon code, cart value, and order total are required');
    }

    if (cartValue <= 0 || orderTotal <= 0) {
      res.status(400);
      throw new Error('Cart value and order total must be greater than 0');
    }

    const normalizedCode = code.toUpperCase().trim();

    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon || !coupon.isActive) {
      res.status(400);
      throw new Error('Invalid or inactive coupon');
    }

    const now = new Date();

    if (coupon.expiryDate && coupon.expiryDate < now) {
      res.status(400);
      throw new Error('Coupon has expired');
    }

    if (
      typeof coupon.usageLimit === 'number' &&
      coupon.usageLimit >= 0 &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      res.status(400);
      throw new Error('Coupon usage limit reached');
    }

    // ✅ FIXED: Check minimum order value against cartValue ONLY, not orderTotal with shipping
    if (coupon.minOrderValue && cartValue < coupon.minOrderValue) {
      res.status(400);
      throw new Error(
        `Minimum cart value for this coupon is INR ${coupon.minOrderValue}`
      );
    }

    if (
      coupon.allowedUsers &&
      coupon.allowedUsers.length > 0 &&
      !coupon.allowedUsers.some(
        (u) => u.toString() === req.user._id.toString()
      )
    ) {
      res.status(400);
      throw new Error('This coupon is not valid for your account');
    }

    const userOrderCount = await Order.countDocuments({ user: req.user._id });

    if (coupon.isFirstOrderOnly) {
      if (userOrderCount > 0) {
        res.status(400);
        throw new Error('This coupon is only valid on your first order');
      }
    }

    if (coupon.perUserLimit && coupon.perUserLimit > 0) {
      const userCouponUsage = await Order.countDocuments({
        user: req.user._id,
        couponCode: coupon.code,
      });

      if (userCouponUsage >= coupon.perUserLimit) {
        res.status(400);
        throw new Error('You have already used this coupon the maximum number of times');
      }
    }

    // ✅ FIXED: Calculate discount ONLY on cartValue, NOT on orderTotal with shipping
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cartValue * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    // ✅ FIXED: Cap discount to cartValue only
    if (discountAmount > cartValue) {
      discountAmount = cartValue;
    }

    // ✅ FIXED: Final total = (cartValue - discount) + shipping
    // The frontend already calculated shipping based on cartValue
    const shippingCost = orderTotal - cartValue; // This will be 0 if free, 100 if paid
    const discountedCartValue = cartValue - discountAmount;
    const finalTotal = discountedCartValue + shippingCost;

    res.json({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount, // ✅ Discount applied to cart only
      originalCartValue: cartValue, // ✅ Original cart subtotal
      shippingCost, // ✅ Shipping cost (separate)
      originalTotal: orderTotal, // ✅ Original total with shipping
      finalTotal, // ✅ (cartValue - discount) + shipping
      minOrderValue: coupon.minOrderValue,
      isFirstOrderOnly: coupon.isFirstOrderOnly,
      isActive: coupon.isActive,
    });
  })
);


module.exports = router;