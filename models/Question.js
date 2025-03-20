const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const AnswerOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, "Answer text is required"],
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false,
  },
})

const QuestionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  text: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  answerOptions: {
    type: [AnswerOptionSchema],
    validate: {
      validator: (options) => {
        // Must have exactly 4 options
        if (options.length !== 4) return false

        // Must have exactly 1 correct answer
        const correctCount = options.filter((option) => option.isCorrect).length
        return correctCount === 1
      },
      message: "Question must have exactly 4 answer options with exactly 1 correct answer",
    },
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Difficult"],
    required: [true, "Difficulty level is required"],
    default: "Medium",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    required: [true, "Status is required"],
    default: "Active",
  },
  category: {
    type: String,
    ref: "Category",
    required: [true, "Category is required"],
  },
  createdBy: {
    type: String,
    ref: "User",
    required: [true, "Creator is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt timestamp before saving
QuestionSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Question", QuestionSchema)

