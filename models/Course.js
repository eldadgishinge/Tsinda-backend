const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const CourseSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  title: {
    type: String,
    required: [true, "Course title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Course description is required"],
    trim: true,
  },
  language: {
    type: String,
    required: [true, "Course language is required"],
    trim: true,
  },
  category: {
    type: String,
    ref: "Category",
    required: [true, "Course category is required"],
  },
  instructor: {
    type: String,
    ref: "User",
    required: [true, "Course instructor is required"],
  },
  videoUrl: {
    type: String,
    trim: true,
  },
  documentUrl: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    default: 0, // Duration in minutes
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner",
  },
  isPublished: {
    type: Boolean,
    default: false,
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
CourseSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Course", CourseSchema)

