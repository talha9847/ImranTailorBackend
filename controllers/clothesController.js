const clothesService = require("../services/clothesService");
const { getDriveFile } = require("../services/googleDriveService");
const photoCache = require("../utils/photoCache");

const { google } = require("googleapis");

const getClothesPhoto = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "File ID is required",
      });
    }

    // -----------------------------
    // CHECK CACHE
    // -----------------------------

    const cachedPhoto = photoCache.get(fileId);

    if (cachedPhoto) {
      console.log("PHOTO CACHE HIT:", fileId);

      res.setHeader("Content-Type", cachedPhoto.contentType);

      res.setHeader("Cache-Control", "public, max-age=1800");

      return res.send(cachedPhoto.buffer);
    }

    console.log("PHOTO CACHE MISS:", fileId);

    // -----------------------------
    // GET FROM GOOGLE DRIVE
    // -----------------------------

    const response = await getDriveFile(fileId);

    const contentType = response.headers["content-type"] || "image/jpeg";

    // -----------------------------
    // CONVERT STREAM TO BUFFER
    // -----------------------------

    const chunks = [];

    response.data.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response.data.on("error", (error) => {
      console.error("Drive stream error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Unable to load photo",
        });
      }
    });

    response.data.on("end", () => {
      const buffer = Buffer.concat(chunks);

      // -----------------------------
      // SAVE TO CACHE
      // -----------------------------

      photoCache.set(fileId, {
        buffer: buffer,
        contentType: contentType,
      });

      console.log("PHOTO CACHED:", fileId);

      // -----------------------------
      // SEND TO CLIENT
      // -----------------------------

      res.setHeader("Content-Type", contentType);

      res.setHeader("Cache-Control", "public, max-age=1800");

      res.send(buffer);
    });
  } catch (error) {
    console.error(
      "Get clothes photo error:",
      error.response?.data || error.message,
    );

    return res.status(404).json({
      success: false,
      message: "Unable to load photo",
    });
  }
};

async function getClothes(req, res) {
  try {
    const { search = "", status = "all" } = req.query;

    const clothes = await clothesService.getClothes({
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      clothes,
    });
  } catch (error) {
    console.error("Get clothes error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to get clothes",
    });
  }
}

async function getClothesById(req, res) {
  try {
    const { id } = req.params;

    const clothes = await clothesService.getClothesById(id);

    if (!clothes) {
      return res.status(404).json({
        success: false,
        message: "Clothes order not found",
      });
    }

    return res.status(200).json({
      success: true,
      clothes,
    });
  } catch (error) {
    console.error("Get clothes by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to get clothes order",
    });
  }
}
const createClothes = async (req, res) => {
  try {
    const { customer_name, contact, remainder_date, delivery_date } = req.body;

    if (!customer_name || !contact || !delivery_date) {
      return res.status(400).json({
        success: false,
        message: "Customer name, contact and delivery date are required",
      });
    }

    const clothPhoto = req.files?.cloth_photo?.[0] || null;

    const notePhoto = req.files?.note_photo?.[0] || null;

    console.log("CREATE FILES:", {
      clothPhoto: !!clothPhoto,
      notePhoto: !!notePhoto,
    });

    const clothes = await clothesService.createClothes({
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      clothPhoto,
      notePhoto,
    });

    return res.status(201).json({
      success: true,
      message: "Clothes created successfully",
      clothes,
    });
  } catch (error) {
    console.error(
      "Create clothes error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateClothes = async (req, res) => {
  try {
    const {
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      status,
      removeClothPhoto,
      removeNotePhoto,
    } = req.body;

    const clothPhoto = req.files?.cloth_photo?.[0] || null;

    const notePhoto = req.files?.note_photo?.[0] || null;

    console.log("UPDATE FILES:", {
      id: req.params.id,
      clothPhoto: !!clothPhoto,
      notePhoto: !!notePhoto,
      removeClothPhoto,
      removeNotePhoto,
    });

    const clothes = await clothesService.updateClothes(req.params.id, {
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      status,
      clothPhoto,
      notePhoto,
      removeClothPhoto,
      removeNotePhoto,
    });

    return res.status(200).json({
      success: true,
      message: "Clothes updated successfully",
      clothes,
    });
  } catch (error) {
    console.error(
      "Update clothes error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

async function updateClothesStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "ready", "delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const clothes = await clothesService.updateClothesStatus(id, status);

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      clothes,
    });
  } catch (error) {
    console.error("Update clothes status error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update status",
    });
  }
}

module.exports = {
  getClothes,
  getClothesById,
  createClothes,
  updateClothes,
  updateClothesStatus,
  getClothesPhoto,
};
