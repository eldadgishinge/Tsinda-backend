const { body } = require("express-validator")

exports.enrollCourseValidator = [body("courseId").notEmpty().withMessage("Course ID is required")]

exports.updateProgressValidator = [
  body("progress")
    .notEmpty()
    .withMessage("Progress is required")
    .isInt({ min: 0, max: 100 })
    .withMessage("Progress must be between 0 and 100"),
]

