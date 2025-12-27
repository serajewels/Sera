const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  name: String // For display without population
}, { 
  timestamps: true 
});

// **CRITICAL INDEXES FOR REVIEW SYSTEM** ⭐
reviewSchema.index({ product: 1, user: 1 });           // Prevent duplicate reviews (FAST)
reviewSchema.index({ product: 1, createdAt: -1 });     // Product reviews by date (FAST)
// REMOVED: reviewSchema.index({ user: 1, product: 1 }); - reverse duplicate
reviewSchema.index({ product: 1, rating: 1 });         // Rating filters (FAST)
reviewSchema.index({ rating: 1 });                     // Top-rated reviews

module.exports = mongoose.model('Review', reviewSchema);
