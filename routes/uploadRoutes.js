const express = require("express")
const router = express.Router()
const multer = require("multer")
const uploadController = require("../controllers/uploadController")
const auth = require("../middleware/auth")

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
})

// @route   POST /api/upload/video
// @desc    Upload a video file
// @access  Private
router.post("/video", auth, upload.single("video"), uploadController.uploadVideo)

// @route   POST /api/upload/document
// @desc    Upload a document file
// @access  Private
router.post("/document", auth, upload.single("document"), uploadController.uploadDocument)

// @route   POST /api/upload/question-image
// @desc    Upload a question image
// @access  Private
router.post("/question-image", auth, upload.single("image"), uploadController.uploadQuestionImage)

module.exports = router

