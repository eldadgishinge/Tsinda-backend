const ExamAttempt = require("../models/ExamAttempt")
const Exam = require("../models/Exam")
const Question = require("../models/Question")
const CourseEnrollment = require("../models/CourseEnrollment")
const { validationResult } = require("express-validator")

// Start a new exam attempt
exports.startExamAttempt = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { examId } = req.body

    // Check if exam exists
    const exam = await Exam.findById(examId)
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if exam is published
    if (exam.status !== "Published") {
      return res.status(400).json({ message: "Exam is not available" })
    }

    // Check if user already has an in-progress attempt
    const existingAttempt = await ExamAttempt.findOne({
      user: req.user.id,
      exam: examId,
      status: "in-progress",
    })

    if (existingAttempt) {
      return res.json(existingAttempt)
    }

    // Create new attempt
    const examAttempt = new ExamAttempt({
      user: req.user.id,
      exam: examId,
      course: exam.course,
      startTime: new Date(),
      answers: [],
      status: "in-progress",
    })

    await examAttempt.save()

    // Return the attempt with exam questions
    const populatedAttempt = await ExamAttempt.findById(examAttempt._id).populate({
      path: "exam",
      populate: {
        path: "questions",
        select: "text imageUrl answerOptions difficulty",
      },
    })

    res.status(201).json(populatedAttempt)
  } catch (error) {
    console.error("Start exam attempt error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Submit an answer for a question in an exam attempt
exports.submitAnswer = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { attemptId, questionId, selectedOption } = req.body

    // Check if attempt exists and belongs to user
    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      user: req.user.id,
      status: "in-progress",
    })

    if (!attempt) {
      return res.status(404).json({ message: "Active exam attempt not found" })
    }

    // Check if question exists
    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }

    // Validate selected option
    if (selectedOption < 0 || selectedOption >= question.answerOptions.length) {
      return res.status(400).json({ message: "Invalid answer option" })
    }

    // Check if answer already exists for this question
    const existingAnswerIndex = attempt.answers.findIndex((answer) => answer.questionId.toString() === questionId)

    // Determine if the selected answer is correct
    const isCorrect = question.answerOptions[selectedOption].isCorrect

    if (existingAnswerIndex !== -1) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = {
        questionId,
        selectedOption,
        isCorrect,
      }
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        selectedOption,
        isCorrect,
      })
    }

    await attempt.save()

    res.json({
      message: "Answer submitted successfully",
      isCorrect,
      attempt,
    })
  } catch (error) {
    console.error("Submit answer error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Complete an exam attempt
exports.completeExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params

    // Check if attempt exists and belongs to user
    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      user: req.user.id,
      status: "in-progress",
    }).populate("exam")

    if (!attempt) {
      return res.status(404).json({ message: "Active exam attempt not found" })
    }

    // Get the exam to calculate score
    const exam = attempt.exam

    // Calculate score
    const totalQuestions = exam.questions.length
    const correctAnswers = attempt.answers.filter((answer) => answer.isCorrect).length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    // Determine if passed
    const isPassed = score >= exam.passingScore

    // Update attempt
    attempt.endTime = new Date()
    attempt.score = score
    attempt.isPassed = isPassed
    attempt.status = "completed"

    await attempt.save()

    // If this is a course exam and the user passed, update course progress
    if (exam.course && isPassed) {
      const enrollment = await CourseEnrollment.findOne({
        user: req.user.id,
        course: exam.course,
        status: "active",
      })

      if (enrollment) {
        // Update progress based on exams completed
        // This is a simplified approach - you might want to implement a more sophisticated progress tracking
        const courseExams = await Exam.find({ course: exam.course, status: "Published" })
        const completedExams = await ExamAttempt.countDocuments({
          user: req.user.id,
          course: exam.course,
          status: "completed",
          isPassed: true,
        })

        if (courseExams.length > 0) {
          const progress = Math.min(Math.round((completedExams / courseExams.length) * 100), 100)
          enrollment.progress = progress

          // If progress is 100%, mark course as completed
          if (progress === 100 && !enrollment.completedAt) {
            enrollment.completedAt = new Date()
          }

          await enrollment.save()
        }
      }
    }

    // Return the completed attempt
    const populatedAttempt = await ExamAttempt.findById(attempt._id).populate("exam").populate({
      path: "answers.questionId",
      select: "text answerOptions",
    })

    res.json({
      message: "Exam completed successfully",
      attempt: populatedAttempt,
      score,
      isPassed,
    })
  } catch (error) {
    console.error("Complete exam attempt error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all exam attempts for a user
exports.getUserExamAttempts = async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({ user: req.user.id })
      .populate("exam", "title description duration passingScore")
      .populate("course", "title")
      .sort({ createdAt: -1 })

    res.json(attempts)
  } catch (error) {
    console.error("Get user exam attempts error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get a specific exam attempt
exports.getExamAttemptById = async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id).populate("exam").populate({
      path: "answers.questionId",
      select: "text imageUrl answerOptions",
    })

    if (!attempt) {
      return res.status(404).json({ message: "Exam attempt not found" })
    }

    // Check if user is authorized to view this attempt
    if (attempt.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" })
    }

    res.json(attempt)
  } catch (error) {
    console.error("Get exam attempt by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all completed exams for a user
exports.getUserCompletedExams = async (req, res) => {
  try {
    const completedAttempts = await ExamAttempt.find({
      user: req.user.id,
      status: "completed",
    })
      .populate("exam", "title description duration passingScore")
      .populate("course", "title")
      .sort({ endTime: -1 })

    res.json(completedAttempts)
  } catch (error) {
    console.error("Get user completed exams error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all passed exams for a user
exports.getUserPassedExams = async (req, res) => {
  try {
    const passedAttempts = await ExamAttempt.find({
      user: req.user.id,
      status: "completed",
      isPassed: true,
    })
      .populate("exam", "title description duration passingScore")
      .populate("course", "title")
      .sort({ endTime: -1 })

    res.json(passedAttempts)
  } catch (error) {
    console.error("Get user passed exams error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

