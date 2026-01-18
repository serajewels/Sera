const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [{
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true, 
      min: 1 
    },
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    name: String // Add product name for reference
  }],
  totalPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  couponCode: {
    type: String,
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  invoiceNumber: {
    type: String,
  },
  status: { 
    type: String, 
    enum: [
      'pending', 
      'processing', 
      'shipped', 
      'delivered', 
      'cancelled', 
      'exchange_requested', 
      'exchange_approved', 
      'exchanged'
    ], 
    default: 'pending' 
  },
  shippingAddress: {
    street: String,        // ✅ Changed from 'address' to 'street'
    city: String,
    state: String,         // ✅ Added state field
    postalCode: String,
    country: String,
    phone: String,
    landmark: String       // ✅ Optional landmark field
  },
  cancellationFee: { type: Number, default: 0, min: 0 },
  exchangeFee: { type: Number, default: 0, min: 0 },
  exchangeReason: { type: String, maxlength: 500 },
  refundAmount: { type: Number, min: 0 },
  deliveredAt: { type: Date },
  paymentMethod: {
    type: String,
    enum: ['card', 'cod', 'upi', 'wallet'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  trackingNumber: String
}, { 
  timestamps: true 
});

// **CRITICAL INDEXES for review eligibility queries**
orderSchema.index({ user: 1, 'items.product': 1, status: 1 });
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ status: 1, deliveredAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
