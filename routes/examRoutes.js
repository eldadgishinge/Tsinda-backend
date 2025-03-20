const express = require("express")
const router = express.Router()
const examController = require("../controllers/examController")
const auth = require("../middleware/auth")
const {
  createExamValidator,
  createRandomExamValidator,
  updateExamValidator,
  questionToExamValidator,
  regenerateQuestionsValidator,
} = require("../middleware/questionValidators")

// @route   GET /api/exams
// @desc    Get all exams
// @access  Private
router.get("/", auth, examController.getAllExams)

// @route   GET /api/exams/:id
// @desc    Get exam by ID
// @access  Private
router.get("/:id", auth, examController.getExamById)

// @route   GET /api/exams/category/:categoryId
// @desc    Get exams by category
// @access  Private
router.get("/category/:categoryId", auth, examController.getExamsByCategory)

// @route   GET /api/exams/course/:courseId
// @desc    Get exams by course
// @access  Private
router.get("/course/:courseId", auth, examController.getExamsByCourse)

// @route   GET /api/exams/creator/me
// @desc    Get exams by logged in creator
// @access  Private
router.get("/creator/me", auth, examController.getExamsByCreator)

// @route   POST /api/exams
// @desc    Create a new exam
// @access  Private
router.post("/", auth, createExamValidator, examController.createExam)

// @route   POST /api/exams/random
// @desc    Create a new exam with random questions
// @access  Private
router.post("/random", auth, createRandomExamValidator, examController.createRandomExam)

// @route   PUT /api/exams/:id
// @desc    Update an exam
// @access  Private
router.put("/:id", auth, updateExamValidator, examController.updateExam)

// @route   PUT /api/exams/:id/regenerate
// @desc    Regenerate random questions for an exam
// @access  Private
router.put("/:id/regenerate", auth, regenerateQuestionsValidator, examController.regenerateExamQuestions)

// @route   DELETE /api/exams/:id
// @desc    Delete an exam
// @access  Private
router.delete("/:id", auth, examController.deleteExam)

// @route   POST /api/exams/:id/questions
// @desc    Add a question to an exam
// @access  Private
router.post("/:id/questions", auth, questionToExamValidator, examController.addQuestionToExam)

// @route   DELETE /api/exams/:id/questions
// @desc    Remove a question from an exam
// @access  Private
router.delete("/:id/questions", auth, questionToExamValidator, examController.removeQuestionFromExam)

module.exports = router

