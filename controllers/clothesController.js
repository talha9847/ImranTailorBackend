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
    const {
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      status,
      cloth_count,
    } = req.body;

    if (!customer_name || !contact || !delivery_date) {
      return res.status(400).json({
        success: false,
        message: "Customer name, contact and delivery date are required",
      });
    }

    // =========================================================
    // ALL UPLOADED FILES
    // =========================================================

    const files = req.files || [];

    // =========================================================
    // CLOTH PHOTOS
    //
    // CREATE request uses repeated:
    // cloth_photos
    //
    // Example:
    // cloth_photos
    // cloth_photos
    // cloth_photos
    // =========================================================

    const clothFiles = files.filter(
      (file) => file.fieldname === "cloth_photos",
    );

    // =========================================================
    // NOTE PHOTO
    // =========================================================

    const notePhoto =
      files.find((file) => file.fieldname === "note_photo") || null;

    // =========================================================
    // DEBUG
    // =========================================================

    console.log("CREATE FILES:", {
      clothPhotos: clothFiles.length,
      notePhoto: !!notePhoto,
      clothCount: cloth_count,
    });

    console.log(
      "CREATE FILE DETAILS:",
      files.map((file) => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
    );

    // =========================================================
    // CREATE CLOTHES
    // =========================================================

    const clothes = await clothesService.createClothes({
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      status,
      cloth_count: Number(cloth_count || 1),
      clothPhotos: clothFiles,
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
      message: error.message || "Unable to create clothes",
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
      removeNotePhoto,
    } = req.body;

    // =========================
    // GET ONLY UPLOADED CLOTH PHOTOS
    // =========================

    const clothPhotos = [];

    for (const file of req.files || []) {
      if (file.fieldname.startsWith("cloth_photos[")) {
        const match = file.fieldname.match(/^cloth_photos\[(\d+)\]$/);

        if (match) {
          clothPhotos.push({
            cloth_number: Number(match[1]),
            file,
          });
        }
      }
    }

    // =========================
    // NOTE PHOTO
    // =========================

    const notePhoto =
      req.files?.find((file) => file.fieldname === "note_photo") || null;

    console.log("UPDATE FILES:", {
      id: req.params.id,

      clothPhotos: clothPhotos.map((item) => item.cloth_number),

      notePhoto: !!notePhoto,

      removeNotePhoto,
    });

    // =========================
    // UPDATE SERVICE
    // =========================

    const clothes = await clothesService.updateClothes(req.params.id, {
      customer_name,
      contact,
      remainder_date,
      delivery_date,
      status,
      clothPhotos,
      notePhoto,
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

async function getAllCustomers(req, res) {
  try {
    const { search = "" } = req.query;

    const customers = await clothesService.getAllCustomers({
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    console.error("Get all customers error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch customers",
    });
  }
}

async function getCustomerOrders(req, res) {
  try {
    const { id } = req.params;

    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const orders = await clothesService.getCustomerOrders(customerId);

    return res.status(200).json({
      success: true,
      message: "Customer orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch customer orders",
    });
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await clothesService.getOrderById(orderId);

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch order",
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
  getAllCustomers,
  getCustomerOrders,
  getOrderById,
};
