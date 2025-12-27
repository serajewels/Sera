const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  phone: { 
    type: String, 
    unique: true,
    sparse: true
  },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  addresses: [{
    addressType: { type: String, default: 'Home' },
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false }
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// **PERFORMANCE INDEXES**
userSchema.index({ email: 1 });                    // Login (ALREADY from unique)
userSchema.index({ phone: 1 });                    // Phone lookup
userSchema.index({ role: 1 });                     // Admin queries
userSchema.index({ 'wishlist': 1 });               // Wishlist operations
userSchema.index({ isActive: 1, createdAt: -1 });  // Active users list

module.exports = mongoose.model('User', userSchema);
