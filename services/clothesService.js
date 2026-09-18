const { Op } = require("sequelize");
const ClothesOrder = require("../models/ClothesOrder");
const Customer = require("../models/Customer");
const { uploadToDrive, deleteFromDrive } = require("./googleDriveService");
const sequelize = require("../config/db");

function getDrivePhotoUrls(fileId) {
  if (!fileId) {
    return null;
  }

  return {
    id: fileId,
    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`,
    url: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}

async function getClothes({ search = "", status = "all" }) {
  const where = {};

  if (status !== "all") {
    where.status = status;
  }

  const customerWhere = {};

  if (search.trim()) {
    customerWhere[Op.or] = [
      {
        customer_name: {
          [Op.iLike]: `%${search.trim()}%`,
        },
      },
      {
        contact: {
          [Op.iLike]: `%${search.trim()}%`,
        },
      },
    ];
  }

  const orders = await ClothesOrder.findAll({
    where,

    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "customer_name", "contact"],
        where: Object.keys(customerWhere).length ? customerWhere : undefined,
      },
    ],

    order: [["delivery_date", "ASC"]],
  });

  return orders.map((order) => {
    const data = order.toJSON();

    return {
      ...data,

      cloth_photo: getDrivePhotoUrls(data.cloth_photo),

      note_photo: getDrivePhotoUrls(data.note_photo),
    };
  });
}

async function getClothesById(id) {
  return ClothesOrder.findByPk(id, {
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "customer_name", "contact"],
      },
    ],
  });
}

async function createClothes(data) {
  const {
    customer_name,
    contact,
    remainder_date,
    delivery_date,
    clothPhoto,
    notePhoto,
  } = data;

  const transaction = await sequelize.transaction();

  try {
    // 1. Find customer
    let customer = await Customer.findOne({
      where: {
        contact,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // 2. Create customer if not found
    if (!customer) {
      customer = await Customer.create(
        {
          customer_name,
          contact,
        },
        {
          transaction,
        },
      );
    } else {
      // Update existing customer name
      await customer.update(
        {
          customer_name,
        },
        {
          transaction,
        },
      );
    }

    // 3. Create order
    const order = await ClothesOrder.create(
      {
        customer_id: customer.id,
        cloth_photo: null,
        note_photo: null,
        remainder_date: remainder_date || null,
        delivery_date,
        status: "pending",
      },
      {
        transaction,
      },
    );

    // 4. Commit DB transaction
    await transaction.commit();

    // 5. Upload photos to Google Drive
    let clothPhotoId = null;
    let notePhotoId = null;

    if (clothPhoto) {
      clothPhotoId = await uploadToDrive(clothPhoto, order.id, "cloth");
    }

    if (notePhoto) {
      notePhotoId = await uploadToDrive(notePhoto, order.id, "note");
    }

    // 6. Save Drive file IDs
    await order.update({
      cloth_photo: clothPhotoId,
      note_photo: notePhotoId,
    });

    // 7. Return complete order
    const result = await ClothesOrder.findByPk(order.id, {
      include: [
        {
          model: Customer,
          as: "customer",
        },
      ],
    });

    const resultData = result.toJSON();

    return {
      ...resultData,
      cloth_photo: getDrivePhotoUrls(resultData.cloth_photo),
      note_photo: getDrivePhotoUrls(resultData.note_photo),
    };
  } catch (error) {
    // Transaction may already be committed
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
}

const updateClothes = async (id, data) => {
  const order = await ClothesOrder.findByPk(id, {
    include: [
      {
        model: Customer,
        as: "customer",
      },
    ],
  });

  if (!order) {
    throw new Error("Clothes order not found");
  }

  const {
    customer_name,
    contact,
    remainder_date,
    delivery_date,
    status,
    clothPhoto,
    notePhoto,
    removeClothPhoto,
    removeNotePhoto,
  } = data;

  // =========================
  // UPDATE CUSTOMER
  // =========================

  if (order.customer) {
    const customerData = {};

    if (customer_name !== undefined) {
      customerData.customer_name = customer_name.trim();
    }

    if (contact !== undefined) {
      customerData.contact = contact.trim();
    }

    if (Object.keys(customerData).length > 0) {
      await order.customer.update(customerData);
    }
  }

  // =========================
  // UPDATE ORDER
  // =========================

  const updateData = {};

  if (remainder_date !== undefined) {
    updateData.remainder_date = remainder_date || null;
  }

  if (delivery_date !== undefined) {
    updateData.delivery_date = delivery_date;
  }

  if (status !== undefined && status !== "") {
    const allowedStatuses = ["pending", "ready", "delivered"];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    updateData.status = status;
  }

  // =========================
  // CLOTH PHOTO
  // =========================

  if (clothPhoto) {
    const newClothPhoto = await uploadToDrive(clothPhoto, order.id, "cloth");

    updateData.cloth_photo = newClothPhoto;
  } else if (removeClothPhoto === "true") {
    updateData.cloth_photo = null;
  }

  // =========================
  // NOTE PHOTO
  // =========================

  if (notePhoto) {
    const newNotePhoto = await uploadToDrive(notePhoto, order.id, "note");

    updateData.note_photo = newNotePhoto;
  } else if (removeNotePhoto === "true") {
    updateData.note_photo = null;
  }

  // =========================
  // SAVE ORDER
  // =========================

  if (Object.keys(updateData).length > 0) {
    await order.update(updateData);
  }

  return await ClothesOrder.findByPk(id, {
    include: [
      {
        model: Customer,
        as: "customer",
      },
    ],
  });
};

async function updateClothesStatus(id, status) {
  try {
    const clothes = await ClothesOrder.findByPk(id);

    if (!clothes) {
      throw new Error("Clothes order not found");
    }

    clothes.status = status;

    await clothes.save();

    return clothes;
  } catch (error) {
    console.error("Update clothes status service error:", error.message);

    throw error;
  }
}
module.exports = {
  getClothes,
  getClothesById,
  createClothes,
  updateClothes,
  updateClothesStatus,
  getDrivePhotoUrls,
};
