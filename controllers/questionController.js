const Question = require("../models/Question")
const Category = require("../models/Category")
const { validationResult } = require("express-validator")

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate("category", "categoryName")
      .populate("createdBy", "email phoneNumber")
      .sort({ createdAt: -1 })

    res.json(questions)
  } catch (error) {
    console.error("Get all questions error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get question by ID
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("category", "categoryName")
      .populate("createdBy", "email phoneNumber")

    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }

    res.json(question)
  } catch (error) {
    console.error("Get question by ID error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get questions by category
exports.getQuestionsByCategory = async (req, res) => {
  try {
    const questions = await Question.find({
      category: req.params.categoryId,
      status: "Active",
    })
      .populate("category", "categoryName")
      .sort({ createdAt: -1 })

    res.json(questions)
  } catch (error) {
    console.error("Get questions by category error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get questions by creator
exports.getQuestionsByCreator = async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user.id })
      .populate("category", "categoryName")
      .sort({ createdAt: -1 })

    res.json(questions)
  } catch (error) {
    console.error("Get questions by creator error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get random questions
exports.getRandomQuestions = async (req, res) => {
  try {
    const { count = 10, categoryId, difficulty, language = "KIN" } = req.query;
    const questionCount = Number.parseInt(count);
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 100) {
      return res.status(400).json({
        message: "Question count must be a number between 1 and 100",
      });
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: { status: "Active" } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryObj",
        },
      },
      { $unwind: "$categoryObj" },
      { $match: { "categoryObj.language": language } },
    ];

    if (categoryId) {
      pipeline.push({ $match: { category: categoryId } });
    }
    if (difficulty) {
      pipeline.push({ $match: { difficulty } });
    }

    // Count total available questions matching the pipeline
    const totalQuestionsArr = await Question.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const totalQuestions = totalQuestionsArr[0]?.total || 0;
    if (totalQuestions === 0) {
      return res.status(404).json({
        message: "No questions found matching the criteria",
      });
    }
    const fetchCount = Math.min(questionCount, totalQuestions);

    // Fetch random questions
    const randomQuestions = await Question.aggregate([
      ...pipeline,
      { $sample: { size: fetchCount } },
    ]);

    // Populate createdBy for each question
    await Question.populate(randomQuestions, [
      { path: "createdBy", select: "email phoneNumber" },
    ]);

    // Exam info
    const examInfo = {
      title: `General Assessment (${fetchCount} Questions) - ${language === "KIN" ? "Kinyarwanda" : language === "ENG" ? "English" : language === "FRA" ? "French" : language}`,
      description: `Custom general assessment with mixed questions in ${language === "KIN" ? "Kinyarwanda" : language === "ENG" ? "English" : language === "FRA" ? "French" : language}`,
      duration: fetchCount, // Duration matches the number of questions returned
      passingScore: 70,
      questionCount: fetchCount,
      category: categoryId || "",
      language,
      questions: randomQuestions,
    };
    res.json(examInfo);
  } catch (error) {
    console.error("Get random questions error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Get random questions by category ID only
exports.getRandomQuestionsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { count = 10 } = req.query;
    const questionCount = Number.parseInt(count);
    
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 100) {
      return res.status(400).json({
        message: "Question count must be a number between 1 and 100",
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Build aggregation pipeline for category-specific questions
    const pipeline = [
      { $match: { status: "Active", category: categoryId } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryObj",
        },
      },
      { $unwind: "$categoryObj" },
    ];

    // Count total available questions in this category
    const totalQuestionsArr = await Question.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const totalQuestions = totalQuestionsArr[0]?.total || 0;
    
    if (totalQuestions === 0) {
      return res.status(404).json({
        message: "No questions found in this category",
      });
    }
    
    const fetchCount = Math.min(questionCount, totalQuestions);

    // Fetch random questions from this category
    const randomQuestions = await Question.aggregate([
      ...pipeline,
      { $sample: { size: fetchCount } },
    ]);

    // Populate createdBy for each question
    await Question.populate(randomQuestions, [
      { path: "createdBy", select: "email phoneNumber" },
    ]);

    // Exam info
    const examInfo = {
      title: `${category.categoryName} Assessment (${fetchCount} Questions)`,
      description: `Random questions from ${category.categoryName} category`,
      duration: fetchCount,
      passingScore: 70,
      questionCount: fetchCount,
      category: categoryId,
      categoryName: category.categoryName,
      language: category.language,
      questions: randomQuestions,
    };
    
    res.json(examInfo);
  } catch (error) {
    console.error("Get random questions by category error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Create new question
exports.createQuestion = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { text, imageUrl, answerOptions, difficulty, status, category } = req.body

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    // Validate answer options
    if (!answerOptions || answerOptions.length !== 4) {
      return res.status(400).json({
        message: "Question must have exactly 4 answer options",
      })
    }

    const correctAnswers = answerOptions.filter((option) => option.isCorrect)
    if (correctAnswers.length !== 1) {
      return res.status(400).json({
        message: "Question must have exactly 1 correct answer",
      })
    }

    const question = new Question({
      text,
      imageUrl,
      answerOptions,
      difficulty,
      status,
      category,
      createdBy: req.user.id,
    })

    await question.save()

    res.status(201).json(question)
  } catch (error) {
    console.error("Create question error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { text, imageUrl, answerOptions, difficulty, status, category } = req.body

    // Check if question exists
    const question = await Question.findById(req.params.id)
    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }

    // Check if user is the question creator
    if (question.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this question" })
    }

    // Check if category exists (if changed)
    if (category && category !== question.category.toString()) {
      const categoryExists = await Category.findById(category)
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" })
      }
    }

    // Validate answer options if provided
    if (answerOptions) {
      if (answerOptions.length !== 4) {
        return res.status(400).json({
          message: "Question must have exactly 4 answer options",
        })
      }

      const correctAnswers = answerOptions.filter((option) => option.isCorrect)
      if (correctAnswers.length !== 1) {
        return res.status(400).json({
          message: "Question must have exactly 1 correct answer",
        })
      }
    }

    // Update question fields
    if (text) question.text = text
    if (imageUrl !== undefined) question.imageUrl = imageUrl
    if (answerOptions) question.answerOptions = answerOptions
    if (difficulty) question.difficulty = difficulty
    if (status) question.status = status
    if (category) question.category = category

    await question.save()

    res.json(question)
  } catch (error) {
    console.error("Update question error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)

    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }

    // Check if user is the question creator
    if (question.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this question" })
    }

    await question.deleteOne()

    res.json({ message: "Question removed" })
  } catch (error) {
    console.error("Delete question error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

