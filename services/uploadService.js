const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class UploadService {
  /**
   * Upload a file to Cloudinary
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} fileName - Original file name
   * @param {string} fileType - MIME type of the file
   * @param {string} folder - Cloudinary folder to upload to
   * @returns {Promise<string>} - URL of the uploaded file
   */
  static async uploadFile(fileBuffer, fileName, fileType, folder = "general") {
    try {
      // Convert buffer to base64
      const base64File = fileBuffer.toString("base64");
      const dataURI = `data:${fileType};base64,${base64File}`;

      // Generate unique public_id
      const uniqueFileName = `${folder}_${uuidv4()}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        public_id: uniqueFileName,
        folder: folder,
        resource_type: "auto",
      });

      return result.secure_url;
    } catch (error) {
      console.error("File upload error:", error);
      throw new Error("File upload failed");
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param {string} fileUrl - URL of the file to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteFile(fileUrl) {
    try {
      // Extract public_id from URL
      const publicId = fileUrl.split("/").slice(-1)[0].split(".")[0];
      
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error("File delete error:", error);
      throw new Error("File delete failed");
    }
  }
}

module.exports = UploadService;