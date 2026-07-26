import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, default: null },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  emailOtp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Password Hash Pre-save middleware
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', UserSchema);
