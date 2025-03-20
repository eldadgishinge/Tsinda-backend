const express = require("express")
const router = express.Router()
const enrollmentController = require("../controllers/enrollmentController")
const auth = require("../middleware/auth")
const { enrollCourseValidator, updateProgressValidator } = require("../middleware/enrollmentValidators")

// @route   GET /api/enrollments
// @desc    Get all enrollments (admin only)
// @access  Private/Admin
router.get("/", auth, enrollmentController.getAllEnrollments)

// @route   GET /api/enrollments/user
// @desc    Get user enrollments
// @access  Private
router.get("/user", auth, enrollmentController.getUserEnrollments)

// @route   GET /api/enrollments/completed
// @desc    Get all completed courses for a user
// @access  Private
router.get("/completed", auth, enrollmentController.getUserCompletedCourses)

// @route   GET /api/enrollments/:id
// @desc    Get enrollment by ID
// @access  Private
router.get("/:id", auth, enrollmentController.getEnrollmentById)

// @route   POST /api/enrollments
// @desc    Enroll in a course
// @access  Private
router.post("/", auth, enrollCourseValidator, enrollmentController.enrollInCourse)

// @route   PUT /api/enrollments/:id/progress
// @desc    Update enrollment progress
// @access  Private
router.put("/:id/progress", auth, updateProgressValidator, enrollmentController.updateProgress)

// @route   PUT /api/enrollments/:enrollmentId/recalculate-progress
// @desc    Recalculate course progress based on completed exams
// @access  Private
router.put("/:enrollmentId/recalculate-progress", auth, enrollmentController.recalculateCourseProgress)

// @route   GET /api/enrollments/check/:courseId
// @desc    Check if user is enrolled in a course
// @access  Private
router.get("/check/:courseId", auth, enrollmentController.checkEnrollment)

module.exports = router

