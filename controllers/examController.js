const Exam = require("../models/Exam")
const Question = require("../models/Question")
const Category = require("../models/Category")
const Course = require("../models/Course")
const { validationResult } = require("express-validator")

// Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("category", "categoryName")
      .populate("course", "title")
      .populate("createdBy", "email phoneNumber")
      .sort({ createdAt: -1 })

    res.json(exams)
  } catch (error) {
    console.error("Get all exams error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("category", "categoryName")
      .populate("course", "title")
      .populate("createdBy", "email phoneNumber")
      .populate("questions")

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    res.json(exam)
  } catch (error) {
    console.error("Get exam by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get exams by category
exports.getExamsByCategory = async (req, res) => {
  try {
    const exams = await Exam.find({
      category: req.params.categoryId,
      status: "Published",
    })
      .populate("category", "categoryName")
      .populate("course", "title")
      .sort({ createdAt: -1 })

    res.json(exams)
  } catch (error) {
    console.error("Get exams by category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get exams by course
exports.getExamsByCourse = async (req, res) => {
  try {
    const exams = await Exam.find({
      course: req.params.courseId,
      status: "Published",
    })
      .populate("category", "categoryName")
      .populate("course", "title")
      .sort({ createdAt: -1 })

    res.json(exams)
  } catch (error) {
    console.error("Get exams by course error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get exams by creator
exports.getExamsByCreator = async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user.id })
      .populate("category", "categoryName")
      .populate("course", "title")
      .sort({ createdAt: -1 })

    res.json(exams)
  } catch (error) {
    console.error("Get exams by creator error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create new exam
exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { title, description, duration, passingScore, questions, category, course, status } = req.body

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    // Check if course exists (if provided)
    if (course) {
      const courseExists = await Course.findById(course)
      if (!courseExists) {
        return res.status(400).json({ message: "Course not found" })
      }
    }

    // Validate questions if provided
    if (questions && questions.length > 0) {
      // Check if all questions exist
      const questionCount = await Question.countDocuments({
        _id: { $in: questions },
        status: "Active",
      })

      if (questionCount !== questions.length) {
        return res.status(400).json({
          message: "One or more questions are invalid or inactive",
        })
      }
    }

    const exam = new Exam({
      title,
      description,
      duration,
      passingScore,
      questions: questions || [],
      category,
      course,
      status: status || "Draft",
      createdBy: req.user.id,
    })

    await exam.save()

    res.status(201).json(exam)
  } catch (error) {
    console.error("Create exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create exam with random questions
exports.createRandomExam = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const {
      title,
      description,
      duration,
      passingScore,
      questionCount = 10,
      category,
      difficulty,
      course,
      status,
    } = req.body

    // Validate question count
    if (questionCount < 1 || questionCount > 100) {
      return res.status(400).json({
        message: "Question count must be between 1 and 100",
      })
    }

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    // Check if course exists (if provided)
    if (course) {
      const courseExists = await Course.findById(course)
      if (!courseExists) {
        return res.status(400).json({ message: "Course not found" })
      }
    }

    // Build query for random questions
    const query = { status: "Active", category }

    if (difficulty) {
      query.difficulty = difficulty
    }

    // Count available questions
    const availableQuestionCount = await Question.countDocuments(query)

    if (availableQuestionCount === 0) {
      return res.status(404).json({
        message: "No questions found matching the criteria",
      })
    }

    // Determine how many questions to fetch
    const fetchCount = Math.min(questionCount, availableQuestionCount)

    // Fetch random questions
    const randomQuestions = await Question.aggregate([{ $match: query }, { $sample: { size: fetchCount } }])

    // Extract question IDs
    const questionIds = randomQuestions.map((q) => q._id)

    // Get the language from the category
    const language = categoryExists.language || "English" // Default to English if not set

    // Create the exam
    const exam = new Exam({
      title,
      description,
      duration,
      passingScore,
      questions: questionIds,
      category,
      course,
      language,
      status: status || "Published",
      createdBy: req.user.id,
    })

    await exam.save()

    // Populate the exam with question details for the response
    const populatedExam = await Exam.findById(exam._id)
      .populate("category", "categoryName")
      .populate("course", "title")
      .populate("questions")

    res.status(201).json({
      exam: populatedExam,
      questionsFetched: fetchCount,
      questionsAvailable: availableQuestionCount,
    })
  } catch (error) {
    console.error("Create random exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update exam
exports.updateExam = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { title, description, duration, passingScore, questions, category, course, status } = req.body

    // Check if exam exists
    const exam = await Exam.findById(req.params.id)
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if user is the exam creator
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this exam" })
    }

    // Check if category exists (if changed)
    if (category && category !== exam.category.toString()) {
      const categoryExists = await Category.findById(category)
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" })
      }
    }

    // Check if course exists (if changed)
    if (course && course !== exam.course?.toString()) {
      const courseExists = await Course.findById(course)
      if (!courseExists) {
        return res.status(400).json({ message: "Course not found" })
      }
    }

    // Validate questions if provided
    if (questions && questions.length > 0) {
      // Check if all questions exist
      const questionCount = await Question.countDocuments({
        _id: { $in: questions },
        status: "Active",
      })

      if (questionCount !== questions.length) {
        return res.status(400).json({
          message: "One or more questions are invalid or inactive",
        })
      }
    }

    // Update exam fields
    if (title) exam.title = title
    if (description) exam.description = description
    if (duration) exam.duration = duration
    if (passingScore !== undefined) exam.passingScore = passingScore
    if (questions) exam.questions = questions
    if (category) exam.category = category
    if (course !== undefined) exam.course = course
    if (status) exam.status = status

    await exam.save()

    res.json(exam)
  } catch (error) {
    console.error("Update exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Regenerate random questions for an exam
exports.regenerateExamQuestions = async (req, res) => {
  try {
    const { questionCount, difficulty } = req.body

    // Check if exam exists
    const exam = await Exam.findById(req.params.id)
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if user is the exam creator
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this exam" })
    }

    // Validate question count if provided
    const count = questionCount || exam.questions.length || 10
    if (count < 1 || count > 100) {
      return res.status(400).json({
        message: "Question count must be between 1 and 100",
      })
    }

    // Build query for random questions
    const query = { status: "Active" }

    // Always use the exam's category
    query.category = exam.category

    // Use provided difficulty or don't filter by difficulty
    if (difficulty) {
      query.difficulty = difficulty
    }

    // Count available questions
    const availableQuestionCount = await Question.countDocuments(query)

    if (availableQuestionCount === 0) {
      return res.status(404).json({
        message: "No questions found matching the criteria",
      })
    }

    // Determine how many questions to fetch
    const fetchCount = Math.min(count, availableQuestionCount)

    // Fetch random questions
    const randomQuestions = await Question.aggregate([{ $match: query }, { $sample: { size: fetchCount } }])

    // Extract question IDs
    const questionIds = randomQuestions.map((q) => q._id)

    // Update the exam with new questions
    exam.questions = questionIds
    await exam.save()

    // Populate the exam with question details for the response
    const populatedExam = await Exam.findById(exam._id)
      .populate("category", "categoryName")
      .populate("course", "title")
      .populate("questions")

    res.json({
      exam: populatedExam,
      questionsFetched: fetchCount,
      questionsAvailable: availableQuestionCount,
    })
  } catch (error) {
    console.error("Regenerate exam questions error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if user is the exam creator
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this exam" })
    }

    await exam.deleteOne()

    res.json({ message: "Exam removed" })
  } catch (error) {
    console.error("Delete exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Add question to exam
exports.addQuestionToExam = async (req, res) => {
  try {
    const { questionId } = req.body

    // Check if exam exists
    const exam = await Exam.findById(req.params.id)
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if user is the exam creator
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this exam" })
    }

    // Check if question exists and is active
    const question = await Question.findOne({
      _id: questionId,
      status: "Active",
    })

    if (!question) {
      return res.status(404).json({ message: "Question not found or inactive" })
    }

    // Check if question is already in the exam
    if (exam.questions.includes(questionId)) {
      return res.status(400).json({ message: "Question already in exam" })
    }

    // Add question to exam
    exam.questions.push(questionId)
    await exam.save()

    res.json(exam)
  } catch (error) {
    console.error("Add question to exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Remove question from exam
exports.removeQuestionFromExam = async (req, res) => {
  try {
    const { questionId } = req.body

    // Check if exam exists
    const exam = await Exam.findById(req.params.id)
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" })
    }

    // Check if user is the exam creator
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this exam" })
    }

    // Check if question is in the exam
    if (!exam.questions.includes(questionId)) {
      return res.status(400).json({ message: "Question not in exam" })
    }

    // Remove question from exam
    exam.questions = exam.questions.filter((q) => q.toString() !== questionId)
    await exam.save()

    res.json(exam)
  } catch (error) {
    console.error("Remove question from exam error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

