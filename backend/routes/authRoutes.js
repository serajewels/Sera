const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product'); // Import Product model
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
}));

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
}));

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      addresses: user.addresses,
      wishlist: user.wishlist, // Include wishlist in profile
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }
    if (req.body.addresses) {
      user.addresses = req.body.addresses.map(addr => ({
        ...addr,
        type: addr.type || 'Home',
        isDefault: Boolean(addr.isDefault)
      }));
    }
    
    try {
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        addresses: updatedUser.addresses,
        wishlist: updatedUser.wishlist,
        token: generateToken(updatedUser._id),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500);
      throw new Error('Error updating profile: ' + error.message);
    }
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Get user wishlist
// @route   GET /api/auth/wishlist
// @access  Private
router.get('/wishlist', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  if (user) {
    const validWishlist = user.wishlist.filter(item => item !== null);
    res.json(validWishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Add to wishlist
// @route   POST /api/auth/wishlist
// @access  Private
router.post('/wishlist', protect, asyncHandler(async (req, res) => {
  const { productId } = req.body;
  
  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('Invalid Product ID format');
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Use $addToSet to prevent duplicates atomically
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).populate('wishlist');

  if (user) {
    res.json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Remove from wishlist
// @route   DELETE /api/auth/wishlist/:id
// @access  Private
router.delete('/wishlist/:id', protect, asyncHandler(async (req, res) => {
  const productId = req.params.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('Invalid Product ID format');
  }

  // Use $pull to remove atomically
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: productId } },
    { new: true }
  ).populate('wishlist');

  if (user) {
    res.json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Toggle wishlist (add if not present, remove if present)
// @route   PUT /api/auth/wishlist/toggle
// @access  Private
router.put('/wishlist/toggle', protect, asyncHandler(async (req, res) => {
  const { productId } = req.body;
  
  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('Invalid Product ID format');
  }

  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isInWishlist = user.wishlist.some(id => id.toString() === productId);
  
  if (isInWishlist) {
    // Remove from wishlist
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } }
    );
  } else {
    // Add to wishlist
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: productId } }
    );
  }

  const updatedUser = await User.findById(req.user._id).populate('wishlist');
  res.json({
    wishlist: updatedUser.wishlist,
    isInWishlist: !isInWishlist
  });
}));

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
router.get('/users', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
  const users = await User.find({});
  res.json(users);
}));

module.exports = router;
