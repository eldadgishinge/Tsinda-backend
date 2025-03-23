const { body } = require("express-validator")

exports.signupValidator = [
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name").notEmpty().withMessage("Name is required").isLength({ min: 3 }).withMessage("Name must be at least 3 characters long"),
  body("role").optional().isIn(["user", "admin", "instructor"]).withMessage("Invalid role"),
]

exports.loginValidator = [
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("password").notEmpty().withMessage("Password is required"),
]

exports.verifyAccountValidator = [
  body("userId").notEmpty().withMessage("User ID is required"),
  body("verificationCode")
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits"),
]

exports.resendVerificationValidator = [body("userId").notEmpty().withMessage("User ID is required")]

