const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const CourseEnrollmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  user: {
    type: String,
    ref: "User",
    required: [true, "User is required"],
  },
  course: {
    type: String,
    ref: "Course",
    required: [true, "Course is required"],
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },
  status: {
    type: String,
    required: [true, "Status is required"],
    enum: ["active", "expired", "cancelled"],
    default: "active",
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  completedAt: {
    type: Date,
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
CourseEnrollmentSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("CourseEnrollment", CourseEnrollmentSchema)

