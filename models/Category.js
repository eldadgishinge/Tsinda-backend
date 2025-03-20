const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const CategorySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  categoryName: {
    type: String,
    required: [true, "Category name is required"],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
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
CategorySchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Category", CategorySchema)

