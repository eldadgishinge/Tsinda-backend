const User = require("../models/User")
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")
const crypto = require("crypto")
const { sendVerificationEmail } = require("../config/email-sender")

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  })
}

// Generate random verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Register new user
exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { phoneNumber, email, password, name, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phoneNumber }, { email }],
    })

    if (existingUser) {
      return res.status(400).json({
        message: "User with this phone number or email already exists",
      })
    }

    // Generate verification code
    const verificationCode = generateVerificationCode()
    const verificationCodeExpires = Date.now() + 3600000 // 1 hour

    // Create new user
    const user = new User({
      phoneNumber,
      email,
      password,
      authMethod: "local",
      verificationCode,
      verificationCodeExpires,
      name,
      role: role || "user"
    })

    await user.save()

    // TODO: Send verification code via SMS or email
    sendVerificationEmail(email, name, verificationCode)

    res.status(201).json({
      message: "User registered successfully. Please verify your account.",
      userId: user._id,
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Login with phone and password
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { phoneNumber, password } = req.body

    // Find user by phone number
    const user = await User.findOne({ phoneNumber })
    if (!user || user.authMethod !== "local") {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your account first",
        userId: user._id,
      })
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Verify account with code
exports.verifyAccount = async (req, res) => {
  try {
    const { userId, verificationCode } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" })
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Invalid verification code" })
    }

    if (Date.now() > user.verificationCodeExpires) {
      return res.status(400).json({ message: "Verification code expired" })
    }

    user.isVerified = true
    user.verificationCode = undefined
    user.verificationCodeExpires = undefined
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: "Account verified successfully",
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Verification error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { userId } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" })
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const verificationCodeExpires = Date.now() + 3600000 // 1 hour

    user.verificationCode = verificationCode
    user.verificationCodeExpires = verificationCodeExpires
    await user.save()

    // TODO: Send verification code via SMS or email
    sendVerificationEmail(user.email, user.name, verificationCode)

    res.json({
      message: "Verification code sent successfully",
      userId: user._id,
    })
  } catch (error) {
    console.error("Resend verification error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    // This function will be called after successful Google authentication
    // The user object will be available in req.user (set by Passport.js)
    const token = generateToken(req.user._id)

    // Redirect to frontend with token
    // You can customize this URL to match your frontend
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`)
  } catch (error) {
    console.error("Google callback error:", error)
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`)
  }
}

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -verificationCode -verificationCodeExpires")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password -verificationCode -verificationCodeExpires")
    res.json(users)
  } catch (error) {
    console.error("Get all users error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update phone number
exports.updatePhoneNumber = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;

    // Check if phone number is already taken
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({ message: "Phone number already in use" });
    }

    // Update user's phone number
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    res.json({
      message: "Phone number updated successfully",
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update phone number error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};