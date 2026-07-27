import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = express.Router();

const generateToken = (userId, email, name) => {
  return jwt.sign(
    { userId, email, name },
    process.env.JWT_SECRET || 'super_secret_jwt_key_multi_agent_2026',
    { expiresIn: '30d' }
  );
};

// Generate 6-digit random OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/auth/register - Register user & send 6-digit OTP email
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    
    // If user exists and is already verified
    if (user && user.isVerified) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Please Sign In instead.' });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (!user) {
      const userId = 'usr_' + Date.now();
      user = await User.create({
        userId,
        name,
        email: email.toLowerCase(),
        password,
        authProvider: 'email',
        isVerified: false,
        emailOtp: otp,
        otpExpires
      });
    } else {
      // Re-update unverified user with new password and OTP
      user.name = name;
      user.password = password;
      user.emailOtp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    }

    // Send OTP Email
    await sendOtpEmail({ email: user.email, name: user.name, otp });

    return res.status(201).json({
      success: true,
      requireOtp: true,
      email: user.email,
      message: `Verification code sent to ${user.email}`
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Please Sign In instead.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify-otp - Verify 6-digit OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isVerified) {
      const token = generateToken(user.userId, user.email, user.name);
      return res.json({ success: true, token, user });
    }

    if (user.emailOtp !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, error: 'Verification code expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user.userId, user.email, user.name);

    return res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - Email/Password Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.isVerified && user.authProvider === 'email') {
      const otp = generateOtp();
      user.emailOtp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendOtpEmail({ email: user.email, name: user.name, otp });

      return res.json({
        success: true,
        requireOtp: true,
        email: user.email,
        message: 'Your email is not verified yet. A new verification code has been sent to your email.'
      });
    }

    const token = generateToken(user.userId, user.email, user.name);

    return res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google - Google OAuth Sync (Auto-verified)
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        userId: 'gusr_' + (googleId || Date.now()),
        name: name || 'Google User',
        email: email.toLowerCase(),
        avatar: avatar || '',
        authProvider: 'google',
        isVerified: true
      });
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user.userId, user.email, user.name);

    return res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/forgot-password - Send OTP to registered email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email address' });
    }

    const otp = generateOtp();
    user.emailOtp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({
      email: user.email,
      name: user.name,
      otp,
      subject: 'Reset Your Password — Sabha.ai'
    });

    return res.json({
      success: true,
      email: user.email,
      message: `Password reset verification code sent to ${user.email}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/reset-password - Verify OTP and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP code, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.emailOtp !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, error: 'Verification code expired. Please request a new code.' });
    }

    // Update password (pre-save middleware in User.js will hash it)
    user.password = newPassword;
    user.emailOtp = null;
    user.otpExpires = null;
    user.isVerified = true;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
