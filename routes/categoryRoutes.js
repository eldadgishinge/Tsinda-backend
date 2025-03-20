const express = require("express")
const router = express.Router()
const categoryController = require("../controllers/categoryController")
const auth = require("../middleware/auth")
const { categoryValidator } = require("../middleware/courseValidators")

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", categoryController.getAllCategories)

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get("/:id", categoryController.getCategoryById)

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private (Admin only)
router.post("/", auth, categoryValidator, categoryController.createCategory)

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private (Admin only)
router.put("/:id", auth, categoryValidator, categoryController.updateCategory)

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private (Admin only)
router.delete("/:id", auth, categoryController.deleteCategory)

module.exports = router

