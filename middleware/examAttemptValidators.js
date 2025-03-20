const { body } = require("express-validator")

exports.startExamValidator = [body("examId").notEmpty().withMessage("Exam ID is required")]

exports.submitAnswerValidator = [
  body("attemptId").notEmpty().withMessage("Attempt ID is required"),
  body("questionId").notEmpty().withMessage("Question ID is required"),
  body("selectedOption").isInt({ min: 0, max: 3 }).withMessage("Selected option must be between 0 and 3"),
]

