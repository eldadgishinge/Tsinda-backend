const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    ref: "Question",
    required: true,
  },
  selectedOption: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
})

const ExamAttemptSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  user: {
    type: String,
    ref: "User",
    required: [true, "User is required"],
  },
  exam: {
    type: String,
    ref: "Exam",
    required: [true, "Exam is required"],
  },
  course: {
    type: String,
    ref: "Course",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  answers: [AnswerSchema],
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  isPassed: {
    type: Boolean,
  },
  status: {
    type: String,
    enum: ["in-progress", "completed", "abandoned"],
    default: "in-progress",
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
ExamAttemptSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("ExamAttempt", ExamAttemptSchema)

