const express = require("express")
const router = express.Router()
const courseController = require("../controllers/courseController")
const auth = require("../middleware/auth")
const { createCourseValidator, updateCourseValidator } = require("../middleware/courseValidators")

// @route   GET /api/courses
// @desc    Get all courses
// @access  Public
router.get("/", courseController.getAllCourses)

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get("/:id", courseController.getCourseById)

// @route   GET /api/courses/category/:categoryId
// @desc    Get courses by category
// @access  Public
router.get("/category/:categoryId", courseController.getCoursesByCategory)

// @route   GET /api/courses/instructor/me
// @desc    Get courses by logged in instructor
// @access  Private
router.get("/instructor/me", auth, courseController.getCoursesByInstructor)

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private
router.post("/", auth, createCourseValidator, courseController.createCourse)

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private
router.put("/:id", auth, updateCourseValidator, courseController.updateCourse)

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private
router.delete("/:id", auth, courseController.deleteCourse)

module.exports = router

