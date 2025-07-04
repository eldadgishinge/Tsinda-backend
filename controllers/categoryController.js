const Category = require("../models/Category")
const { validationResult } = require("express-validator")

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ categoryName: 1 })
    res.json(categories)
  } catch (error) {
    console.error("Get all categories error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    res.json(category)
  } catch (error) {
    console.error("Get category by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { categoryName, description ,language} = req.body

    // Check if category already exists
    const existingCategory = await Category.findOne({ categoryName })
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" })
    }

    const category = new Category({
      categoryName,
      description,
      language
    })

    await category.save()

    res.status(201).json(category)
  } catch (error) {
    console.error("Create category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { categoryName, description,language } = req.body

    // Check if category exists
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Check if new category name already exists (if changed)
    if (categoryName !== category.categoryName) {
      const existingCategory = await Category.findOne({ categoryName })
      if (existingCategory) {
        return res.status(400).json({ message: "Category name already exists" })
      }
    }

    // Update category
    category.categoryName = categoryName
    category.description = description
    category.language = language
    category.updatedAt = Date.now();

    await category.save()

    res.json(category)
  } catch (error) {
    console.error("Update category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    await category.deleteOne()

    res.json({ message: "Category removed" })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

