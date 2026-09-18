const { Op } = require("sequelize");
const ClothesOrder = require("../models/ClothesOrder");
const Customer = require("../models/Customer");
const { uploadToDrive, deleteFromDrive } = require("./googleDriveService");
const sequelize = require("../config/db");
const OrderClothes = require("../models/OrderClothes");

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

      // IMPORTANT: get all clothes belonging to the order
      {
        model: OrderClothes,
        as: "clothes",
        attributes: ["id", "order_id", "cloth_number", "cloth_photo"],
        order: [["cloth_number", "ASC"]],
      },
    ],

    order: [["delivery_date", "ASC"]],
  });

  return orders.map((order) => {
    const data = order.toJSON();

    return {
      ...data,

      // Multiple cloth photos
      clothes: (data.clothes || []).map((cloth) => ({
        ...cloth,
        cloth_photo: getDrivePhotoUrls(cloth.cloth_photo),
      })),

      note_photo: getDrivePhotoUrls(data.note_photo),
    };
  });
}

async function getClothesById(id) {
  const order = await ClothesOrder.findByPk(id, {
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "customer_name", "contact"],
      },

      {
        model: OrderClothes,
        as: "clothes",
        attributes: ["id", "order_id", "cloth_number", "cloth_photo"],
        order: [["cloth_number", "ASC"]],
      },
    ],
  });

  if (!order) {
    return null;
  }

  const data = order.toJSON();

  return {
    ...data,

    clothes: (data.clothes || []).map((cloth) => ({
      ...cloth,
      cloth_photo: getDrivePhotoUrls(cloth.cloth_photo),
    })),

    note_photo: getDrivePhotoUrls(data.note_photo),
  };
}

async function createClothes(data) {
  const {
    customer_name,
    contact,
    remainder_date,
    delivery_date,
    clothPhotos = [],
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
        note_photo: null,
        remainder_date: remainder_date || null,
        delivery_date,
        status: "pending",
      },
      {
        transaction,
      },
    );

    // 4. Upload cloth photos
    // Uploading to Drive is NOT transactional,
    // but the database records below ARE transactional.
    const clothRecords = [];

    for (let index = 0; index < clothPhotos.length; index++) {
      const clothPhoto = clothPhotos[index];

      if (!clothPhoto) {
        continue;
      }

      const clothPhotoId = await uploadToDrive(
        clothPhoto,
        order.id,
        `order_${order.id}_cloth_${index + 1}`,
      );

      clothRecords.push({
        order_id: order.id,
        cloth_number: index + 1,
        cloth_photo: clothPhotoId,
      });
    }

    // 5. Create all cloth records INSIDE transaction
    if (clothRecords.length > 0) {
      await OrderClothes.bulkCreate(clothRecords, {
        transaction,
      });
    }

    // 6. Upload note photo

    if (notePhoto) {
      const notePhotoId = await uploadToDrive(
        notePhoto,
        order.id,
        `order_${order.id}_note`,
      );
      await order.update(
        {
          note_photo: notePhotoId,
        },
        {
          transaction,
        },
      );
    }

    // 7. Commit EVERYTHING together
    await transaction.commit();

    // 8. Fetch complete order
    const result = await ClothesOrder.findByPk(order.id, {
      include: [
        {
          model: Customer,
          as: "customer",
        },
        {
          model: OrderClothes,
          as: "clothes",
        },
      ],
    });

    const resultData = result.toJSON();

    // 9. Convert Drive IDs to URLs
    resultData.clothes = (resultData.clothes || []).map((cloth) => ({
      ...cloth,
      cloth_photo: getDrivePhotoUrls(cloth.cloth_photo),
    }));

    resultData.note_photo = getDrivePhotoUrls(resultData.note_photo);

    return resultData;
  } catch (error) {
    // Rollback customer + order + order_clothes + note DB records
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
}

const updateClothes = async (id, data) => {
  const transaction = await sequelize.transaction();

  try {
    // =========================================================
    // 1. LOCK ONLY THE ORDER
    //    IMPORTANT:
    //    Do NOT include Customer here while using FOR UPDATE.
    // =========================================================

    const order = await ClothesOrder.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
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
      clothPhotos = [],
      notePhoto,
      removeNotePhoto,
    } = data;

    // =========================================================
    // 2. GET CUSTOMER SEPARATELY
    // =========================================================

    const customer = await Customer.findByPk(order.customer_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customer) {
      throw new Error(
        `Customer ${order.customer_id} not found for order ${order.id}`,
      );
    }

    // =========================================================
    // 3. UPDATE CUSTOMER
    // =========================================================

    const customerData = {};

    if (customer_name !== undefined) {
      customerData.customer_name = customer_name.trim();
    }

    if (contact !== undefined) {
      customerData.contact = contact.trim();
    }

    if (Object.keys(customerData).length > 0) {
      await customer.update(customerData, {
        transaction,
      });
    }

    // =========================================================
    // 4. UPDATE ORDER
    // =========================================================

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

    if (Object.keys(updateData).length > 0) {
      await order.update(updateData, {
        transaction,
      });
    }

    // =========================================================
    // 5. UPDATE ONLY CHANGED CLOTH PHOTOS
    // =========================================================

    if (Array.isArray(clothPhotos) && clothPhotos.length > 0) {
      for (const cloth of clothPhotos) {
        const clothNumber = Number(cloth.cloth_number);
        const file = cloth.file;

        if (!Number.isInteger(clothNumber) || clothNumber < 1) {
          throw new Error(`Invalid cloth number: ${cloth.cloth_number}`);
        }

        if (!file) {
          continue;
        }

        console.log(`Updating cloth ${clothNumber} for order ${order.id}`);

        // -----------------------------------------------------
        // Check that this cloth already exists
        // -----------------------------------------------------

        const existingCloth = await OrderClothes.findOne({
          where: {
            order_id: order.id,
            cloth_number: clothNumber,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!existingCloth) {
          throw new Error(
            `Cloth ${clothNumber} not found for order ${order.id}`,
          );
        }

        // -----------------------------------------------------
        // Upload replacement photo to Google Drive
        // -----------------------------------------------------

        const newClothPhoto = await uploadToDrive(
          file,
          order.id,
          `order_${order.id}_cloth_${clothNumber}`,
        );

        // -----------------------------------------------------
        // Update only this cloth row
        // -----------------------------------------------------

        await existingCloth.update(
          {
            cloth_photo: newClothPhoto,
          },
          {
            transaction,
          },
        );

        console.log(`Cloth ${clothNumber} updated successfully`);
      }
    }

    // =========================================================
    // 6. NOTE PHOTO
    // =========================================================

    if (notePhoto) {
      console.log(`Updating note photo for order ${order.id}`);

      const newNotePhoto = await uploadToDrive(
        notePhoto,
        order.id,
        `order_${order.id}_note`,
      );

      await order.update(
        {
          note_photo: newNotePhoto,
        },
        {
          transaction,
        },
      );
    } else if (removeNotePhoto === "true") {
      console.log(`Removing note photo for order ${order.id}`);

      await order.update(
        {
          note_photo: null,
        },
        {
          transaction,
        },
      );
    }

    // =========================================================
    // 7. COMMIT
    // =========================================================

    await transaction.commit();

    console.log(`Order ${order.id} updated successfully`);

    // =========================================================
    // 8. FETCH COMPLETE UPDATED ORDER
    //    This query is AFTER the transaction and does NOT lock.
    // =========================================================

    const updatedOrder = await ClothesOrder.findByPk(id, {
      include: [
        {
          model: Customer,
          as: "customer",
        },
        {
          model: OrderClothes,
          as: "clothes",
          separate: true,
          order: [["cloth_number", "ASC"]],
        },
      ],
    });

    return updatedOrder;
  } catch (error) {
    console.error("Update clothes service error:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
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
