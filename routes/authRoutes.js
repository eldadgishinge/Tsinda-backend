
const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const auth = require("../middleware/auth")
const {
  signupValidator,
  loginValidator,
  verifyAccountValidator,
  resendVerificationValidator,
  updatePhoneValidator,
  updatePasswordValidator,
} = require("../middleware/validators")
const passport = require("passport")

// @route   POST /api/auth/signup
// @desc    Register a user
// @access  Public
router.post("/signup", signupValidator, authController.signup)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", loginValidator, authController.login)

// @route   POST /api/auth/verify
// @desc    Verify user account with code
// @access  Public
router.post("/verify", verifyAccountValidator, authController.verifyAccount)

// @route   POST /api/auth/resend-verification
// @desc    Resend verification code
// @access  Public
router.post("/resend-verification", resendVerificationValidator, authController.resendVerificationCode)

// @route   GET /api/auth/google
// @desc    Google OAuth login
// @access  Public
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  authController.googleCallback,
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, authController.getCurrentUser)

// @route   PUT /api/auth/phone
// @desc    Update phone number
// @access  Private
router.put("/phone", auth, updatePhoneValidator, authController.updatePhoneNumber)

// @route   PUT /api/auth/password
// @desc    Update password
// @access  Private
router.put("/password", auth, updatePasswordValidator, authController.updatePassword)

// get all users
router.get("/all", auth, authController.getAllUsers)

module.exports = router