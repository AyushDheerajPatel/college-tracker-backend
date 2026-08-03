const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Configure nodemailer transporter
const createTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  // Console fallback if email credentials are not configured yet
  return {
    sendMail: async (options) => {
      console.log(`✉️ [OTP EMAIL LOG] To: ${options.to} | Subject: ${options.subject} | Content: ${options.text}`);
      return { messageId: 'mock-id' };
    },
  };
};

const sendOtpEmail = async (email, otp) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER || '"College Tracker" <noreply@collegetracker.com>',
    to: email,
    subject: 'Your Verification Code - College Tracker',
    text: `Your OTP for College Tracker verification is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">College Tracker Verification</h2>
        <p style="font-size: 14px; color: #64748b;">Please enter the following 6-digit OTP code to complete your registration or login:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists
    let existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Unverified existing user: update password, name, and generate new OTP
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;

      await existingUser.save();

      try {
        await sendOtpEmail(emailLower, otp);
      } catch (err) {
        console.error("Nodemailer error:", err);
        return res.status(500).json({ message: "Failed to send OTP email.", error: err.message });
      }

      return res.status(200).json({
        message: 'OTP sent to email',
        email: emailLower,
      });
    }

    // Hash password & generate OTP for new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save new unverified user
    const newUser = new User({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      isVerified: false,
      otp,
      otpExpires,
    });

    await newUser.save();

    try {
      await sendOtpEmail(emailLower, otp);
    } catch (err) {
      console.error("Nodemailer error:", err);
      return res.status(500).json({ message: "Failed to send OTP email.", error: err.message });
    }

    return res.status(200).json({
      message: 'OTP sent to email',
      email: emailLower,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide both email and OTP' });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    // Mark user verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Server error during OTP verification', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If user is not verified, generate new OTP and prompt verification
    if (!user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      try {
        await sendOtpEmail(emailLower, otp);
      } catch (err) {
        console.error("Nodemailer error:", err);
        return res.status(500).json({ message: "Failed to send OTP email.", error: err.message });
      }

      return res.status(200).json({
        success: false,
        requireOtp: true,
        message: 'Account not verified. A new OTP has been sent to your email.',
        email: emailLower,
      });
    }

    // Sign JWT token for verified user
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

module.exports = router;
