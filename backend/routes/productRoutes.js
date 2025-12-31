const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

// Helper to resolve product names to IDs
const resolveProductNamesToIds = async (identifiers) => {
  if (!identifiers || identifiers.length === 0) return [];
  
  // If identifiers are already ObjectIds (hex strings of length 24), keep them
  // If they are names, find the products
  const resolvedIds = [];
  const namesToFind = [];

  for (const id of identifiers) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      resolvedIds.push(id);
    } else {
      namesToFind.push(id.trim()); // Assume it's a name
    }
  }

  if (namesToFind.length > 0) {
    const foundProducts = await Product.find({
      name: { $in: namesToFind.map(n => new RegExp(`^${n}$`, 'i')) } // Case-insensitive exact match
    }).select('_id');
    
    foundProducts.forEach(p => resolvedIds.push(p._id));
  }

  return resolvedIds;
};

// Input validation middleware
const validateProductInput = (req, res, next) => {
  const { name, price, description, category, images, stock } = req.body;
  
  if (!name || !price || !category) {
    res.status(400);
    throw new Error('Name, price, and category are required');
  }
  
  if (price < 0 || stock < 0) {
    res.status(400);
    throw new Error('Price and stock cannot be negative');
  }
  
  if (images && !Array.isArray(images)) {
    res.status(400);
    throw new Error('Images must be an array of URLs');
  }
  
  next();
};

const validateReviewInput = (req, res, next) => {
  const { rating, comment } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }
  
  if (comment && comment.length > 1000) {
    res.status(400);
    throw new Error('Comment cannot exceed 1000 characters');
  }
  
  next();
};

// @desc    Fetch all products with pagination and filtering
// @route   GET /api/products
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;
  
  // Build query
  const query = {};

  if (req.query.keyword) {
    query.name = {
      $regex: req.query.keyword,
      $options: 'i'
    };
  }

  if (req.query.category) {
    query.category = req.query.category.toLowerCase();
  }

  if (req.query.tags) {
    const tagsArray = req.query.tags.split(',').map(t => t.trim().toLowerCase());
    query.tags = { $in: tagsArray };
  }

  const products = await Product.find(query)
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate('reviews', 'rating comment name');

  const total = await Product.countDocuments(query);
  
  res.json({
    products,
    page,
    pages: Math.ceil(total / limit),
    total
  });
}));

// @desc    Fetch single product with populated reviews
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('reviews', 'rating comment name createdAt user')
    .populate('accentPairs', 'name price images category');
  
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
}));

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, validateProductInput, asyncHandler(async (req, res) => {
  const { name, price, description, category, images, stock, tags, accentPairs } = req.body;

  const resolvedAccentPairs = await resolveProductNamesToIds(accentPairs);

  const product = new Product({
    name,
    price,
    description,
    category,
    images,
    stock,
    tags,
    accentPairs: resolvedAccentPairs,
    user: req.user._id,
  });

  const createdProduct = await product.save();

  // Bidirectional Update: Add this new product to the accentPairs of the referenced products
  if (resolvedAccentPairs.length > 0) {
    await Product.updateMany(
      { _id: { $in: resolvedAccentPairs } },
      { $addToSet: { accentPairs: createdProduct._id } }
    );
  }

  res.status(201).json(createdProduct);
}));

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, validateProductInput, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = req.body.name || product.name;
    product.price = req.body.price || product.price;
    product.description = req.body.description || product.description;
    product.category = req.body.category || product.category;
    product.images = req.body.images || product.images;
    product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
    product.tags = req.body.tags || product.tags;
    
    if (req.body.accentPairs) {
      const oldPairs = (product.accentPairs || []).map(id => id.toString());
      
      // Ensure we only process valid inputs
      const safeAccentPairs = Array.isArray(req.body.accentPairs) 
        ? req.body.accentPairs.filter(p => p && typeof p === 'string' && p.trim() !== '')
        : [];

      const newPairsIds = await resolveProductNamesToIds(safeAccentPairs);
      const newPairsStrings = newPairsIds.map(id => id.toString());

      // Identify added and removed pairs
      const added = newPairsIds.filter(id => !oldPairs.includes(id.toString()));
      const removed = oldPairs.filter(id => !newPairsStrings.includes(id));

      // Update added pairs: Add current product ID to them
      if (added.length > 0) {
        await Product.updateMany(
          { _id: { $in: added } },
          { $addToSet: { accentPairs: product._id } }
        );
      }

      // Update removed pairs: Remove current product ID from them
      if (removed.length > 0) {
        await Product.updateMany(
          { _id: { $in: removed } },
          { $pull: { accentPairs: product._id } }
        );
      }

      product.accentPairs = newPairsIds;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
}));

// @desc    Delete a product (cascade delete reviews)
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Delete associated reviews
    await Review.deleteMany({ product: req.params.id });
    
    // Remove this product from other products' accentPairs
    await Product.updateMany(
      { accentPairs: req.params.id },
      { $pull: { accentPairs: req.params.id } }
    );

    await product.deleteOne();
    res.json({ message: 'Product removed successfully' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
}));

// @desc    Get user's review eligibility for product (FIXED for your Order schema)
// @route   GET /api/products/:id/review-eligibility
// @access  Private
router.get('/:id/review-eligibility', protect, asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      'items.product': req.params.id,        // FIXED: 'items.product' (not orderItems)
      status: { $in: ['delivered', 'exchanged'] }  // FIXED: lowercase matching your enum
    }).select('items status');

    const canReview = orders.length > 0;
    res.json({ canReview, eligibleOrders: orders.length });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to check review eligibility');
  }
}));

// @desc    Create new review with delivery verification (FIXED for your Order schema)
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, validateReviewInput, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  // Check delivery eligibility (FIXED field names)
  const deliveredOrders = await Order.find({
    user: req.user._id,
    'items.product': req.params.id,        // FIXED: 'items.product'
    status: { $in: ['delivered', 'exchanged'] }  // FIXED: lowercase enum values
  }).select('status');

  if (deliveredOrders.length === 0) {
    res.status(403);
    throw new Error('You can only review products that have been delivered to you');
  }

  // Transaction for data consistency (with proper mongoose import)
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const review = await Review.create([{
      name: req.user.name,
      rating: Number(rating),
      comment: comment?.trim() || '',
      user: req.user._id,
      product: product._id
    }], { session });

    // Add review reference to product
    product.reviews.push(review[0]._id);
    
    // Calculate accurate average rating and count
    const reviews = await Review.find({ product: product._id }).session(session);
    product.numReviews = reviews.length;
    product.rating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;

    await product.save({ session });
    await session.commitTransaction();
    
    // Return created review with populated data
    const createdReview = await Review.findById(review[0]._id)
      .populate('user', 'name')
      .populate('product', 'name');

    // Refresh product with updated rating for frontend
    const updatedProduct = await Product.findById(req.params.id)
      .populate('reviews', 'rating comment name');

    res.status(201).json({ 
      message: 'Review added successfully',
      review: createdReview,
      product: updatedProduct
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

module.exports = router;
