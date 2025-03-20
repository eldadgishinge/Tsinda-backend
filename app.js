const express = require("express")
const mongoose = require("mongoose")
const passport = require("./config/passport")
const session = require("express-session")
const cors = require("cors")
require("dotenv").config()

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// Session middleware (required for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "tsinda-cyane-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
)

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Authentication middleware
const auth = require("./middleware/auth")

// Routes that don't require authentication
app.use("/api/auth", require("./routes/authRoutes"))

// Apply authentication middleware to all routes below
app.use(auth)

// Routes that require authentication
app.use("/api/categories", require("./routes/categoryRoutes"))
app.use("/api/courses", require("./routes/courseRoutes"))
app.use("/api/upload", require("./routes/uploadRoutes"))
app.use("/api/questions", require("./routes/questionRoutes"))
app.use("/api/exams", require("./routes/examRoutes"))
app.use("/api/enrollments", require("./routes/enrollmentRoutes"))
app.use("/api/exam-attempts", require("./routes/examAttemptRoutes"))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// Start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

module.exports = app

