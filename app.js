const express = require("express")
const mongoose = require("mongoose")
const passport = require("./config/passport")
const session = require("express-session")
const cors = require("cors")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use(
  session({
    secret: process.env.SESSION_SECRET || "tsinda-cyane-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

// Only connect to MongoDB if not in test environment
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err))
}

const auth = require("./middleware/auth")

const devAuth = (req, res, next) => {
  // In test environment, always create a mock user
  if (process.env.NODE_ENV === 'test') {
    req.user = {
      _id: "test-user-id",
      email: "test@example.com",
      phoneNumber: "1234567890",
      role: "user"
    }
    return next()
  }
  
  // In development, check for Authorization header
  if (process.env.NODE_ENV !== "production") {
    if (!req.header("Authorization")) {
      req.user = {
        _id: "dev-user-id",
        email: "dev@example.com",
        phoneNumber: "1234567890",
        role: "user"
      }
      return next()
    }
  }
  return auth(req, res, next)
}

if (process.env.NODE_ENV !== "production") {
  app.get("/api/dev/token", (req, res) => {
    const token = jwt.sign(
      { id: "dev-user-id" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "24h" }
    )
    res.json({
      token,
      message: "Development token generated. Use this in Authorization header: Bearer <token>"
    })
  })
}

app.use("/api/auth", require("./routes/authRoutes"))

app.use(devAuth)

app.use("/api/categories", require("./routes/categoryRoutes"))
app.use("/api/courses", require("./routes/courseRoutes"))
app.use("/api/upload", require("./routes/uploadRoutes"))
app.use("/api/questions", require("./routes/questionRoutes"))
app.use("/api/exams", require("./routes/examRoutes"))
app.use("/api/enrollments", require("./routes/enrollmentRoutes"))
app.use("/api/exam-attempts", require("./routes/examAttemptRoutes"))

app.use("/hello", (req, res) => {
  res.json({ message: "Tsinda Backend Application is ready deployed" });
});

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

module.exports = app

