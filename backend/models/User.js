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
    required: true,
    unique: true
  },
  isEmailVerified: {
    type: Boolean,
    default: true  // Always true since user is created only after OTP verification
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

// Only hash if password is being modified (for profile updates)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  
  // Check if already hashed (password from TempUser is already hashed)
  if (this.password.startsWith('$2')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'wishlist': 1 });
userSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
