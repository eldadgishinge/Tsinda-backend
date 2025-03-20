const { body } = require("express-validator")

exports.createCourseValidator = [
  body("title")
    .notEmpty()
    .withMessage("Course title is required")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Course description is required")
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),
  body("language").notEmpty().withMessage("Course language is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("videoUrl").optional().isURL().withMessage("Video URL must be a valid URL"),
  body("documentUrl").optional().isURL().withMessage("Document URL must be a valid URL"),
  body("duration").optional().isNumeric().withMessage("Duration must be a number"),
  body("level")
    .optional()
    .isIn(["Beginner", "Intermediate", "Advanced"])
    .withMessage("Level must be Beginner, Intermediate, or Advanced"),
]

exports.updateCourseValidator = [
  body("title").optional().isLength({ min: 5, max: 100 }).withMessage("Title must be between 5 and 100 characters"),
  body("description").optional().isLength({ min: 20 }).withMessage("Description must be at least 20 characters"),
  body("videoUrl").optional().isURL().withMessage("Video URL must be a valid URL"),
  body("documentUrl").optional().isURL().withMessage("Document URL must be a valid URL"),
  body("duration").optional().isNumeric().withMessage("Duration must be a number"),
  body("level")
    .optional()
    .isIn(["Beginner", "Intermediate", "Advanced"])
    .withMessage("Level must be Beginner, Intermediate, or Advanced"),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be a boolean"),
]

exports.categoryValidator = [
  body("categoryName")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Category name must be between 3 and 50 characters"),
  body("description").optional().isLength({ max: 200 }).withMessage("Description cannot exceed 200 characters"),
]

