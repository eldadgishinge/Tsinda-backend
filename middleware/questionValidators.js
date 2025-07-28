const { body, query } = require("express-validator")

exports.createQuestionValidator = [
  body("text")
    .notEmpty()
    .withMessage("Question text is required")
    .isLength({ min: 5 })
    .withMessage("Question text must be at least 5 characters"),
  body("imageUrl").optional().isString().withMessage("Image URL must be a string"),
  body("answerOptions").isArray({ min: 4, max: 4 }).withMessage("Question must have exactly 4 answer options"),
  body("answerOptions.*.text").notEmpty().withMessage("Answer option text is required"),
  body("answerOptions.*.isCorrect").isBoolean().withMessage("isCorrect must be a boolean"),
  body("rightAnswerDescription").optional().isString().withMessage("Right answer description must be a string"),
  body("difficulty").isIn(["Easy", "Medium", "Difficult"]).withMessage("Difficulty must be Easy, Medium, or Difficult"),
  body("status").isIn(["Active", "Inactive"]).withMessage("Status must be Active or Inactive"),
  body("category").notEmpty().withMessage("Category is required"),
]

exports.updateQuestionValidator = [
  body("text").optional().isLength({ min: 5 }).withMessage("Question text must be at least 5 characters"),
  body("imageUrl").optional().isString().withMessage("Image URL must be a string"),
  body("answerOptions")
    .optional()
    .isArray({ min: 4, max: 4 })
    .withMessage("Question must have exactly 4 answer options"),
  body("answerOptions.*.text").optional().notEmpty().withMessage("Answer option text is required"),
  body("answerOptions.*.isCorrect").optional().isBoolean().withMessage("isCorrect must be a boolean"),
  body("rightAnswerDescription").optional().isString().withMessage("Right answer description must be a string"),
  body("difficulty")
    .optional()
    .isIn(["Easy", "Medium", "Difficult"])
    .withMessage("Difficulty must be Easy, Medium, or Difficult"),
  body("status").optional().isIn(["Active", "Inactive"]).withMessage("Status must be Active or Inactive"),
  body("category").optional().notEmpty().withMessage("Category is required"),
]

exports.randomQuestionsValidator = [
  query("count").optional().isInt({ min: 1, max: 100 }).withMessage("Count must be between 1 and 100"),
  query("categoryId").optional(),
  query("difficulty")
    .optional()
    .isIn(["Easy", "Medium", "Difficult"])
    .withMessage("Difficulty must be Easy, Medium, or Difficult"),
  query("language")
    .optional()
    .isIn(["KIN", "ENG", "FRA"])
    .withMessage("Language must be KIN, ENG, or FRA"),
]

exports.createExamValidator = [
  body("title")
    .notEmpty()
    .withMessage("Exam title is required")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Exam description is required")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters"),
  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isInt({ min: 1 })
    .withMessage("Duration must be at least 1 minute"),
  body("passingScore")
    .notEmpty()
    .withMessage("Passing score is required")
    .isInt({ min: 0, max: 100 })
    .withMessage("Passing score must be between 0 and 100"),
  body("questions").optional().isArray().withMessage("Questions must be an array"),
  body("category").notEmpty().withMessage("Category is required"),
  body("course").optional(),
  body("status")
    .optional()
    .isIn(["Draft", "Published", "Archived"])
    .withMessage("Status must be Draft, Published, or Archived"),
]

exports.createRandomExamValidator = [
  body("title")
    .notEmpty()
    .withMessage("Exam title is required")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Exam description is required")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters"),
  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isInt({ min: 1 })
    .withMessage("Duration must be at least 1 minute"),
  body("passingScore")
    .notEmpty()
    .withMessage("Passing score is required")
    .isInt({ min: 0, max: 100 })
    .withMessage("Passing score must be between 0 and 100"),
  body("questionCount").optional().isInt({ min: 1, max: 100 }).withMessage("Question count must be between 1 and 100"),
  body("category").notEmpty().withMessage("Category is required"),
  body("difficulty")
    .optional()
    .isIn(["Easy", "Medium", "Difficult"])
    .withMessage("Difficulty must be Easy, Medium, or Difficult"),
  body("course").optional(),
  body("status")
    .optional()
    .isIn(["Draft", "Published", "Archived"])
    .withMessage("Status must be Draft, Published, or Archived"),
]

exports.regenerateQuestionsValidator = [
  body("questionCount").optional().isInt({ min: 1, max: 100 }).withMessage("Question count must be between 1 and 100"),
  body("difficulty")
    .optional()
    .isIn(["Easy", "Medium", "Difficult"])
    .withMessage("Difficulty must be Easy, Medium, or Difficult"),
]

exports.updateExamValidator = [
  body("title").optional().isLength({ min: 5, max: 100 }).withMessage("Title must be between 5 and 100 characters"),
  body("description").optional().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("duration").optional().isInt({ min: 1 }).withMessage("Duration must be at least 1 minute"),
  body("passingScore").optional().isInt({ min: 0, max: 100 }).withMessage("Passing score must be between 0 and 100"),
  body("questions").optional().isArray().withMessage("Questions must be an array"),
  body("category").optional(),
  body("course").optional(),
  body("status")
    .optional()
    .isIn(["Draft", "Published", "Archived"])
    .withMessage("Status must be Draft, Published, or Archived"),
]

exports.questionToExamValidator = [body("questionId").notEmpty().withMessage("Question ID is required")]

