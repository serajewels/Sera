const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  items: [{
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    quantity: { 
      type: Number, 
      default: 1,
      min: 1 
    },
    price: Number // Snapshot price
  }]
}, { timestamps: true });

// **CART PERFORMANCE INDEXES**
// REMOVED: cartSchema.index({ user: 1 }); - duplicate of unique: true
cartSchema.index({ 'items.product': 1 });          // Product stock checks

module.exports = mongoose.model('Cart', cartSchema);
