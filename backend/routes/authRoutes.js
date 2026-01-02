const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const TempUser = require('../models/TempUser');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register - Store in TempUser & send OTP (NO real user created yet)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if user ALREADY EXISTS in main User collection
  const [userExists, phoneExists] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ phone })
  ]);

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email. Please login.');
  }

  if (phoneExists) {
    res.status(400);
    throw new Error('Phone number already registered.');
  }

  // Delete any existing TempUser with same email/phone (previous registration attempts)
  await TempUser.deleteMany({ $or: [{ email }, { phone }] });

  // Generate OTP
  const otp = generateOTP();

  try {
    // Store in TempUser collection (NOT User)
    const tempUser = await TempUser.create({
      name,
      email,
      password, // Will be auto-hashed by pre-save hook
      phone,
      otp
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email. Please verify within 10 minutes to complete registration.',
      email: tempUser.email
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500);
    throw new Error('Registration failed. Please try again.');
  }
}));

// @desc    Verify OTP - Create REAL user only after verification
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error('Please provide email and OTP');
  }

  // Find TempUser with matching email and OTP
  const tempUser = await TempUser.findOne({ email, otp });

  if (!tempUser) {
    res.status(400);
    throw new Error('Invalid or expired OTP. Please register again.');
  }

  try {
    // NOW create the real user in User collection
    const user = await User.create({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password, // Already hashed in TempUser
      phone: tempUser.phone,
      isEmailVerified: true
    });

    // Delete TempUser after successful creation
    await TempUser.deleteOne({ email });

    // Return user data with token
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      token: generateToken(user._id),
      message: 'Registration successful! Welcome to Sera Jewelry.'
    });

  } catch (error) {
    console.error('User creation error:', error);
    res.status(500);
    throw new Error('Failed to create user account. Please try again.');
  }
}));

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide email');
  }

  // Check if TempUser exists
  const tempUser = await TempUser.findOne({ email });

  if (!tempUser) {
    res.status(404);
    throw new Error('Registration session expired. Please register again.');
  }

  // Check if already a verified user
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Email already verified. Please login.');
  }

  // Generate new OTP
  const otp = generateOTP();

  // Update TempUser with new OTP and reset expiry
  tempUser.otp = otp;
  tempUser.createdAt = Date.now(); // Reset 10-min timer
  await tempUser.save();

  try {
    await sendOTPEmail(email, otp);
    
    res.json({
      success: true,
      message: 'New OTP sent successfully. Please check your email.'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500);
    throw new Error('Failed to send OTP. Please try again.');
  }
}));

// @desc    Login - Only verified users can login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Only search in User collection (verified users only)
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
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
      phone: user.phone,
      role: user.role,
      addresses: user.addresses,
      wishlist: user.wishlist,
      isEmailVerified: user.isEmailVerified
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
    user.phone = req.body.phone || user.phone;
    
    if (req.body.password) {
      user.password = req.body.password;
    }
    
    if (req.body.addresses) {
      user.addresses = req.body.addresses.map(addr => ({
        ...addr,
        addressType: addr.addressType || 'Home',
        isDefault: Boolean(addr.isDefault)
      }));
    }
    
    try {
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        addresses: updatedUser.addresses,
        wishlist: updatedUser.wishlist,
        isEmailVerified: updatedUser.isEmailVerified,
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

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('Invalid Product ID format');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

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

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error('Invalid Product ID format');
  }

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

// @desc    Toggle wishlist
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
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } }
    );
  } else {
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

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide email');
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found with this email');
  }

  // Generate OTP
  const otp = generateOTP();

  // Save OTP and expiry (10 mins) to user
  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  try {
    await sendPasswordResetEmail(email, otp);
    
    res.json({
      success: true,
      message: 'Password reset OTP sent to your email.'
    });
  } catch (error) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    console.error('Forgot password error:', error);
    res.status(500);
    throw new Error('Failed to send password reset email. Please try again.');
  }
}));

// @desc    Reset Password - Verify OTP and Set New Password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  const user = await User.findOne({
    email,
    resetPasswordOtp: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  });
}));

// @desc    Change Password - Logged in user
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new password');
  }

  const user = await User.findById(req.user._id);

  if (user && (await user.matchPassword(currentPassword))) {
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } else {
    res.status(401);
    throw new Error('Invalid current password');
  }
}));

module.exports = router;
