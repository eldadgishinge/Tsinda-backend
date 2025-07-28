const UploadService = require("../services/uploadService")
const { validationResult } = require("express-validator")

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/ogg"]
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only MP4, WebM, and OGG video formats are allowed",
      })
    }

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

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

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

    const fileUrl = await UploadService.uploadFile(
      req.file.buffer, 
      req.file.originalname, 
      req.file.mimetype,
      "documents"
    )

    res.json({
      message: "Document uploaded successfully",
      documentUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      accessNote: "Document is publicly accessible. If you experience access issues, the document may need a few moments to propagate."
    })
  } catch (error) {
    console.error("Upload document error:", error)
    res.status(500).json({ 
      message: "Document upload failed",
      error: error.message 
    })
  }
}

exports.uploadQuestionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed",
      })
    }

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

