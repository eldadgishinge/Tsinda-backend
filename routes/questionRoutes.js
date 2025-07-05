const express = require("express")
const router = express.Router()
const questionController = require("../controllers/questionController")
const auth = require("../middleware/auth")
const {
  createQuestionValidator,
  updateQuestionValidator,
  randomQuestionsValidator,
} = require("../middleware/questionValidators")

// @route   GET /api/questions
// @desc    Get all questions
// @access  Private
router.get("/", auth, questionController.getAllQuestions)

// @route   GET /api/questions/random
// @desc    Get random questions
// @access  Private
router.get("/random", auth, randomQuestionsValidator, questionController.getRandomQuestions)

// @route   GET /api/questions/random/category/:categoryId
// @desc    Get random questions by category ID
// @access  Private
router.get("/random/category/:categoryId", auth, questionController.getRandomQuestionsByCategory)

// @route   GET /api/questions/:id
// @desc    Get question by ID
// @access  Private
router.get("/:id", auth, questionController.getQuestionById)

// @route   GET /api/questions/category/:categoryId
// @desc    Get questions by category
// @access  Private
router.get("/category/:categoryId", auth, questionController.getQuestionsByCategory)

// @route   GET /api/questions/creator/me
// @desc    Get questions by logged in creator
// @access  Private
router.get("/creator/me", auth, questionController.getQuestionsByCreator)

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post("/", auth, createQuestionValidator, questionController.createQuestion)

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private
router.put("/:id", auth, updateQuestionValidator, questionController.updateQuestion)

// @route   DELETE /api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete("/:id", auth, questionController.deleteQuestion)

module.exports = router

