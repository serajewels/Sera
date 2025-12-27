const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String,
    trim: true
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: { 
    type: Number, 
    default: 0,
    min: 0
  },
  reviews: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Review' 
  }],
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  }
}, { 
  timestamps: true 
});

// **IMPORTANT INDEXES**
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ 'reviews': 1, 'numReviews': -1 });
productSchema.index({ rating: -1, numReviews: -1 });
productSchema.index({ featured: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
