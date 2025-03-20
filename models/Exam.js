const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const ExamSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  title: {
    type: String,
    required: [true, "Exam title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Exam description is required"],
    trim: true,
  },
  duration: {
    type: Number,
    required: [true, "Exam duration is required"],
    min: [1, "Duration must be at least 1 minute"],
  },
  passingScore: {
    type: Number,
    required: [true, "Passing score is required"],
    min: [0, "Passing score cannot be negative"],
    max: [100, "Passing score cannot exceed 100"],
  },
  questions: [
    {
      type: String,
      ref: "Question",
    },
  ],
  category: {
    type: String,
    ref: "Category",
    required: [true, "Category is required"],
  },
  course: {
    type: String,
    ref: "Course",
  },
  status: {
    type: String,
    enum: ["Draft", "Published", "Archived"],
    default: "Draft",
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
ExamSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Exam", ExamSchema)

