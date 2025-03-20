const CourseEnrollment = require("../models/CourseEnrollment")
const Course = require("../models/Course")
const Exam = require("../models/Exam")
const ExamAttempt = require("../models/ExamAttempt")
const { validationResult } = require("express-validator")

// Get all enrollments (admin only)
exports.getAllEnrollments = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" })
    }

    const enrollments = await CourseEnrollment.find()
      .populate("user", "email phoneNumber")
      .populate("course", "title")
      .sort({ createdAt: -1 })

    res.json(enrollments)
  } catch (error) {
    console.error("Get all enrollments error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get user enrollments
exports.getUserEnrollments = async (req, res) => {
  try {
    const enrollments = await CourseEnrollment.find({
      user: req.user.id,
      status: "active",
    })
      .populate("course", "title description videoUrl documentUrl")
      .sort({ enrollmentDate: -1 })

    res.json(enrollments)
  } catch (error) {
    console.error("Get user enrollments error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get enrollment by ID
exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await CourseEnrollment.findById(req.params.id)
      .populate("user", "email phoneNumber")
      .populate("course")

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" })
    }

    // Check if user is authorized to view this enrollment
    if (enrollment.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" })
    }

    res.json(enrollment)
  } catch (error) {
    console.error("Get enrollment by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Enroll in a course
exports.enrollInCourse = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { courseId } = req.body

    // Check if course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Check if user is already enrolled
    const existingEnrollment = await CourseEnrollment.findOne({
      user: req.user.id,
      course: courseId,
      status: "active",
    })

    if (existingEnrollment) {
      return res.status(400).json({ message: "Already enrolled in this course" })
    }

    // Set expiry date (1 year from now by default)
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Create enrollment
    const enrollment = new CourseEnrollment({
      user: req.user.id,
      course: courseId,
      expiryDate,
    })

    await enrollment.save()

    res.status(201).json(enrollment)
  } catch (error) {
    console.error("Enroll in course error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update enrollment progress
exports.updateProgress = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { progress } = req.body

    // Find the enrollment
    const enrollment = await CourseEnrollment.findById(req.params.id)
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" })
    }

    // Check if user is authorized
    if (enrollment.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" })
    }

    // Update progress
    enrollment.progress = progress

    // If progress is 100%, mark as completed
    if (progress === 100 && !enrollment.completedAt) {
      enrollment.completedAt = new Date()
    }

    await enrollment.save()

    res.json(enrollment)
  } catch (error) {
    console.error("Update progress error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Check if user is enrolled in a course
exports.checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params

    const enrollment = await CourseEnrollment.findOne({
      user: req.user.id,
      course: courseId,
      status: "active",
      expiryDate: { $gte: new Date() },
    })

    res.json({
      isEnrolled: !!enrollment,
      enrollment,
    })
  } catch (error) {
    console.error("Check enrollment error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all completed courses for a user
exports.getUserCompletedCourses = async (req, res) => {
  try {
    const completedEnrollments = await CourseEnrollment.find({
      user: req.user.id,
      completedAt: { $exists: true, $ne: null },
      status: "active",
    })
      .populate("course", "title description videoUrl documentUrl")
      .sort({ completedAt: -1 })

    res.json(completedEnrollments)
  } catch (error) {
    console.error("Get user completed courses error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Calculate and update course progress based on completed exams
exports.recalculateCourseProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params

    // Find the enrollment
    const enrollment = await CourseEnrollment.findOne({
      _id: enrollmentId,
      user: req.user.id,
      status: "active",
    })

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" })
    }

    // Get all exams for the course
    const courseExams = await Exam.find({
      course: enrollment.course,
      status: "Published",
    })

    if (courseExams.length === 0) {
      return res.status(400).json({ message: "No exams found for this course" })
    }

    // Get all passed exam attempts for the user in this course
    const passedExams = await ExamAttempt.countDocuments({
      user: req.user.id,
      course: enrollment.course,
      status: "completed",
      isPassed: true,
    })

    // Calculate progress percentage
    const progress = Math.min(Math.round((passedExams / courseExams.length) * 100), 100)

    // Update enrollment
    enrollment.progress = progress

    // If progress is 100%, mark as completed
    if (progress === 100 && !enrollment.completedAt) {
      enrollment.completedAt = new Date()
    }

    await enrollment.save()

    res.json({
      message: "Course progress updated successfully",
      enrollment,
      totalExams: courseExams.length,
      passedExams,
      progress,
    })
  } catch (error) {
    console.error("Recalculate course progress error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

