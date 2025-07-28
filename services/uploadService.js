const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class UploadService {
  static async uploadFile(fileBuffer, fileName, fileType, folder = "general") {
    try {
      const base64File = fileBuffer.toString("base64");
      const dataURI = `data:${fileType};base64,${base64File}`;
      const uniqueFileName = `${folder}_${uuidv4()}`;

      let resourceType = "auto";
      if (fileType.startsWith("image/")) {
        resourceType = "image";
      } else if (fileType.startsWith("video/")) {
        resourceType = "video";
      } else {
        resourceType = "raw";
      }

      const result = await cloudinary.uploader.upload(dataURI, {
        public_id: uniqueFileName,
        folder: folder,
        resource_type: resourceType,
        access_mode: "public",
        flags: "attachment",
      });

      return result.secure_url;
    } catch (error) {
      console.error("File upload error:", error);
      throw new Error("File upload failed");
    }
  }

  static async deleteFile(fileUrl) {
    try {
      const publicId = fileUrl.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error("File delete error:", error);
      throw new Error("File delete failed");
    }
  }

  static async getSignedUrl(publicId, expiresIn = 3600) {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        {
          public_id: publicId,
          timestamp: timestamp,
        },
        process.env.CLOUDINARY_API_SECRET
      );

      return `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/download?public_id=${publicId}&timestamp=${timestamp}&signature=${signature}`;
    } catch (error) {
      console.error("Signed URL generation error:", error);
      throw new Error("Failed to generate signed URL");
    }
  }
}

module.exports = UploadService;