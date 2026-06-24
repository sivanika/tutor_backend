import fs from "fs";
import cloudinary from "../config/cloudinary.js";

/**
 * Uploads a local file to Cloudinary and deletes the local file after upload.
 * @param {string} filePath - Path to the local file.
 * @param {string} folder - Target folder name in Cloudinary.
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
export const uploadToCloudinary = async (filePath, folder) => {
  try {
    const options = {
      folder: folder || "tutor-hours",
      resource_type: "auto", // Automatically detects image, video, raw, etc.
    };

    const result = await cloudinary.uploader.upload(filePath, options);

    // Delete local file after successful upload
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    // Delete local file even if upload fails to prevent server accumulation
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error("Failed to delete local file after failed upload:", err);
      }
    }
    throw error;
  }
};

/**
 * Deletes an asset from Cloudinary.
 * @param {string} publicId - The public ID of the Cloudinary asset.
 * @param {string} [resourceType="image"] - The resource type (image, video, raw).
 * @returns {Promise<any>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    throw error;
  }
};
