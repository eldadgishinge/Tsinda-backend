const express = require("express")
const router = express.Router()
const examAttemptController = require("../controllers/examAttemptController")
const auth = require("../middleware/auth")
const { startExamValidator, submitAnswerValidator } = require("../middleware/examAttemptValidators")

// @route   POST /api/exam-attempts/start
// @desc    Start a new exam attempt
// @access  Private
router.post("/start", auth, startExamValidator, examAttemptController.startExamAttempt)

// @route   POST /api/exam-attempts/submit-answer
// @desc    Submit an answer for a question in an exam attempt
// @access  Private
router.post("/submit-answer", auth, submitAnswerValidator, examAttemptController.submitAnswer)

// @route   PUT /api/exam-attempts/:attemptId/complete
// @desc    Complete an exam attempt
// @access  Private
router.put("/:attemptId/complete", auth, examAttemptController.completeExamAttempt)

// @route   GET /api/exam-attempts
// @desc    Get all exam attempts for a user
// @access  Private
router.get("/", auth, examAttemptController.getUserExamAttempts)

// @route   GET /api/exam-attempts/completed
// @desc    Get all completed exams for a user
// @access  Private
router.get("/completed", auth, examAttemptController.getUserCompletedExams)

// @route   GET /api/exam-attempts/passed
// @desc    Get all passed exams for a user
// @access  Private
router.get("/passed", auth, examAttemptController.getUserPassedExams)

// @route   GET /api/exam-attempts/:id
// @desc    Get a specific exam attempt
// @access  Private
router.get("/:id", auth, examAttemptController.getExamAttemptById)

module.exports = router

