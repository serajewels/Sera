const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  image: String,
  description: String,
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// **CATEGORY INDEXES**
categorySchema.index({ name: 1 });                 // Fast category lookup
categorySchema.index({ isActive: 1 });             // Active categories

module.exports = mongoose.model('Category', categorySchema);
