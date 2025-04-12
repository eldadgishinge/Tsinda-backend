const Course = require("../models/Course")
const Category = require("../models/Category")
const { validationResult } = require("express-validator")

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("category", "categoryName")
      .populate("instructor", "email phoneNumber")
      .sort({ createdAt: -1 })

    res.json(courses)
  } catch (error) {
    console.error("Get all courses error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("category", "categoryName")
      .populate("instructor", "email phoneNumber")

    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    res.json(course)
  } catch (error) {
    console.error("Get course by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get courses by category
exports.getCoursesByCategory = async (req, res) => {
  try {
    const courses = await Course.find({ category: req.params.categoryId })
      .populate("category", "categoryName")
      .populate("instructor", "email phoneNumber")
      .sort({ createdAt: -1 })

    res.json(courses)
  } catch (error) {
    console.error("Get courses by category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get courses by instructor
exports.getCoursesByInstructor = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
      .populate("category", "categoryName")
      .sort({ createdAt: -1 })

    res.json(courses)
  } catch (error) {
    console.error("Get courses by instructor error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create new course
exports.createCourse = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { title, description, language, category, thumbnailUrl, videoUrl, documentUrl, duration, level } = req.body

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    const course = new Course({
      title,
      description,
      language,
      category,
      instructor: req.user.id,
      videoUrl,
      documentUrl,
      thumbnailUrl,
      duration,
      level,
    })

    await course.save()

    res.status(201).json(course)
  } catch (error) {
    console.error("Create course error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { title, description, language, category, videoUrl, documentUrl, duration, level, isPublished } = req.body

    // Check if course exists
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Check if user is the course instructor
    if (course.instructor.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this course" })
    }

    // Check if category exists (if changed)
    if (category && category !== course.category.toString()) {
      const categoryExists = await Category.findById(category)
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" })
      }
    }

    // Update course fields
    if (title) course.title = title
    if (description) course.description = description
    if (language) course.language = language
    if (category) course.category = category
    if (videoUrl !== undefined) course.videoUrl = videoUrl
    if (documentUrl !== undefined) course.documentUrl = documentUrl
    if (duration) course.duration = duration
    if (level) course.level = level
    if (isPublished !== undefined) course.isPublished = isPublished

    await course.save()

    res.json(course)
  } catch (error) {
    console.error("Update course error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Check if user is the course instructor
    if (course.instructor.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this course" })
    }

    await course.deleteOne()

    res.json({ message: "Course removed" })
  } catch (error) {
    console.error("Delete course error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

