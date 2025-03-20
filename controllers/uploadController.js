const UploadService = require("../services/uploadService")
const { validationResult } = require("express-validator")

// Upload video
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Check file type
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg"]
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only MP4, WebM, and OGG video formats are allowed",
      })
    }

    // Upload file to cloud storage
    const fileUrl = await UploadService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

    res.json({
      message: "Video uploaded successfully",
      videoUrl: fileUrl,
    })
  } catch (error) {
    console.error("Upload video error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only PDF and Word documents are allowed",
      })
    }

    // Upload file to cloud storage
    const fileUrl = await UploadService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

    res.json({
      message: "Document uploaded successfully",
      documentUrl: fileUrl,
    })
  } catch (error) {
    console.error("Upload document error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Upload question image
exports.uploadQuestionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed",
      })
    }

    // Upload file to cloud storage
    const fileUrl = await UploadService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

    res.json({
      message: "Image uploaded successfully",
      imageUrl: fileUrl,
    })
  } catch (error) {
    console.error("Upload question image error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

