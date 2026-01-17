const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },
    expiryDate: {
      type: Date,
      required: true
    },
    usageLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    firstOrderOnly: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiryDate: 1 });

module.exports = mongoose.model('Coupon', couponSchema);

