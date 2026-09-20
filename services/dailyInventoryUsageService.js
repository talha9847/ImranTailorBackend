const {
  Inventory,
  DailyInventoryUsage,
  DailyInventoryUsageItem,
} = require("../models/association");
const { Op } = require("sequelize");

const sequelize = require("../config/db");

// =========================================================
// GET ALL INVENTORY PRODUCTS
// =========================================================

async function getInventoryProducts() {
  try {
    const inventory = await Inventory.findAll({
      attributes: [
        "id",
        "cloth_name",
        "quantity",
        "buying_price",
        "selling_price",
      ],

      order: [["id", "ASC"]],
    });

    return inventory;
  } catch (error) {
    throw error;
  }
}

// =========================================================
// GET USAGE BY DATE
// =========================================================

async function getUsageByDate(date) {
  try {
    const usage = await DailyInventoryUsage.findOne({
      where: {
        usage_date: date,
      },

      include: [
        {
          model: DailyInventoryUsageItem,
          as: "items",

          include: [
            {
              model: Inventory,
              as: "inventory",

              attributes: [
                "id",
                "cloth_name",
                "quantity",
                "buying_price",
                "selling_price",
              ],
            },
          ],
        },
      ],
    });

    if (!usage) {
      return {
        usage: null,
        products: [],
      };
    }

    return {
      usage,
      products: usage.items || [],
    };
  } catch (error) {
    throw error;
  }
}

// =========================================================
// GET LAST 10 DAYS HISTORY
// =========================================================

async function getUsageHistory() {
  try {
    const history = await DailyInventoryUsage.findAll({
      include: [
        {
          model: DailyInventoryUsageItem,
          as: "items",

          include: [
            {
              model: Inventory,
              as: "inventory",

              attributes: ["id", "cloth_name"],
            },
          ],
        },
      ],

      order: [["usage_date", "DESC"]],

      limit: 10,
    });

    return history;
  } catch (error) {
    throw error;
  }
}

// =========================================================
// SAVE / UPDATE USAGE ITEM
// =========================================================

async function saveUsageItem({ usage_date, inventory_id, quantity }) {
  const transaction = await sequelize.transaction();

  try {
    quantity = Number(quantity);
    inventory_id = Number(inventory_id);

    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("Quantity must be greater than 0");

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------------
    // GET INVENTORY
    // -----------------------------------------------------

    const inventory = await Inventory.findByPk(inventory_id, {
      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!inventory) {
      const error = new Error("Inventory not found");

      error.statusCode = 404;

      throw error;
    }

    // -----------------------------------------------------
    // GET DAILY USAGE
    // -----------------------------------------------------

    let usage = await DailyInventoryUsage.findOne({
      where: {
        usage_date,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    // -----------------------------------------------------
    // CREATE DAILY USAGE
    // -----------------------------------------------------

    if (!usage) {
      usage = await DailyInventoryUsage.create(
        {
          usage_date,
          total_items: 0,
        },
        {
          transaction,
        },
      );
    }

    // -----------------------------------------------------
    // GET EXISTING USAGE ITEM
    // -----------------------------------------------------

    let usageItem = await DailyInventoryUsageItem.findOne({
      where: {
        usage_id: usage.id,
        inventory_id,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    // -----------------------------------------------------
    // OLD QUANTITY
    // -----------------------------------------------------

    const oldQuantity = usageItem ? Number(usageItem.quantity) : 0;

    // -----------------------------------------------------
    // DIFFERENCE
    // -----------------------------------------------------

    const difference = quantity - oldQuantity;

    // -----------------------------------------------------
    // CHECK INVENTORY
    // -----------------------------------------------------

    if (difference > 0 && Number(inventory.quantity) < difference) {
      const error = new Error(
        `Only ${inventory.quantity} items available in inventory`,
      );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------------
    // UPDATE INVENTORY
    // -----------------------------------------------------

    await inventory.update(
      {
        quantity: Number(inventory.quantity) - difference,
      },
      {
        transaction,
      },
    );

    // -----------------------------------------------------
    // TOTAL AMOUNT
    // -----------------------------------------------------

    const totalAmount = quantity * Number(inventory.selling_price);

    // -----------------------------------------------------
    // CREATE / UPDATE USAGE ITEM
    // -----------------------------------------------------

    if (usageItem) {
      await usageItem.update(
        {
          quantity,

          buying_price: inventory.buying_price,

          selling_price: inventory.selling_price,

          total_amount: totalAmount,
        },
        {
          transaction,
        },
      );
    } else {
      usageItem = await DailyInventoryUsageItem.create(
        {
          usage_id: usage.id,

          inventory_id: inventory.id,

          quantity,

          buying_price: inventory.buying_price,

          selling_price: inventory.selling_price,

          total_amount: totalAmount,
        },
        {
          transaction,
        },
      );
    }

    // -----------------------------------------------------
    // UPDATE DAILY TOTAL
    // -----------------------------------------------------

    await usage.update(
      {
        total_items: Number(usage.total_items) + difference,
      },
      {
        transaction,
      },
    );

    // -----------------------------------------------------
    // COMMIT
    // -----------------------------------------------------

    await transaction.commit();

    return {
      usage,
      usageItem,
      inventory,
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
}

async function revertUsageItem(usageItemId) {
  const transaction = await sequelize.transaction();

  try {
    usageItemId = Number(usageItemId);

    if (!Number.isInteger(usageItemId) || usageItemId <= 0) {
      const error = new Error("Invalid usage item ID");
      error.statusCode = 400;
      throw error;
    }

    const usageItem = await DailyInventoryUsageItem.findByPk(usageItemId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!usageItem) {
      const error = new Error("Usage item not found");
      error.statusCode = 404;
      throw error;
    }

    const usage = await DailyInventoryUsage.findByPk(usageItem.usage_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!usage) {
      const error = new Error("Daily usage record not found");
      error.statusCode = 404;
      throw error;
    }

    const createdAt = new Date(usageItem.created_at);

    if (Number.isNaN(createdAt.getTime())) {
      const error = new Error("Usage item creation date is invalid");
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();

    const age = now.getTime() - createdAt.getTime();

    const threeDays = 10 * 24 * 60 * 60 * 1000;

    if (age < 0 || age > threeDays) {
      const error = new Error(
        "This product can only be reverted within 3 days of being added",
      );

      error.statusCode = 400;

      throw error;
    }

    const inventory = await Inventory.findByPk(usageItem.inventory_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!inventory) {
      const error = new Error("Inventory not found");
      error.statusCode = 404;
      throw error;
    }

    await inventory.update(
      {
        quantity: Number(inventory.quantity) + Number(usageItem.quantity),
      },
      {
        transaction,
      },
    );

    const newTotal = Number(usage.total_items) - Number(usageItem.quantity);

    await usage.update(
      {
        total_items: Math.max(0, newTotal),
      },
      {
        transaction,
      },
    );

    await usageItem.destroy({
      transaction,
    });

    if (newTotal <= 0) {
      await usage.destroy({
        transaction,
      });
    }

    await transaction.commit();

    return {
      success: true,
      message: "Product usage reverted successfully",
      usage_item_id: usageItemId,
      inventory_id: inventory.id,
      restored_quantity: Number(usageItem.quantity),
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
}

async function getSellingHistoryByDateRange({ start_date, end_date }) {
  if (!start_date || !end_date) {
    const error = new Error("Start date and end date are required");

    error.statusCode = 400;

    throw error;
  }

  const startDate = String(start_date);
  const endDate = String(end_date);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    const error = new Error("Dates must be in YYYY-MM-DD format");

    error.statusCode = 400;

    throw error;
  }

  // -------------------------------------------------------
  // VALIDATE DATE RANGE
  // -------------------------------------------------------

  if (startDate > endDate) {
    const error = new Error("Start date cannot be after end date");

    error.statusCode = 400;

    throw error;
  }

  // -------------------------------------------------------
  // GET HISTORY
  // -------------------------------------------------------

  const history = await DailyInventoryUsage.findAll({
    where: {
      usage_date: {
        [Op.between]: [startDate, endDate],
      },
    },

    include: [
      {
        model: DailyInventoryUsageItem,
        as: "items",

        include: [
          {
            model: Inventory,
            as: "inventory",

            attributes: [
              "id",
              "cloth_name",
              "quantity",
              "buying_price",
              "selling_price",
            ],
          },
        ],
      },
    ],

    order: [["usage_date", "DESC"]],
  });

  // -------------------------------------------------------
  // FORMAT HISTORY
  // -------------------------------------------------------

  const result = history.map((usage) => {
    const items = (usage.items || []).map((item) => {
      const quantity = Number(item.quantity || 0);

      const sellingPrice = Number(item.selling_price || 0);

      const totalAmount =
        item.total_amount !== null && item.total_amount !== undefined
          ? Number(item.total_amount)
          : quantity * sellingPrice;

      return {
        id: item.id,

        usage_id: item.usage_id,

        inventory_id: item.inventory_id,

        quantity,

        buying_price: Number(item.buying_price || 0),

        selling_price: sellingPrice,

        total_amount: totalAmount,

        created_at: item.created_at,

        inventory: item.inventory
          ? {
              id: item.inventory.id,

              cloth_name: item.inventory.cloth_name,

              quantity: Number(item.inventory.quantity || 0),

              buying_price: Number(item.inventory.buying_price || 0),

              selling_price: Number(item.inventory.selling_price || 0),
            }
          : null,
      };
    });

    // -----------------------------------------------------
    // DAILY TOTAL SELLING AMOUNT
    // -----------------------------------------------------

    const totalSellingAmount = items.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0,
    );

    // -----------------------------------------------------
    // DAILY TOTAL CLOTHES
    // -----------------------------------------------------

    const totalItems = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    return {
      id: usage.id,

      usage_date: usage.usage_date,

      total_items: totalItems,

      total_selling_amount: totalSellingAmount,

      items,
    };
  });

  // -------------------------------------------------------
  // GRAND TOTAL
  // -------------------------------------------------------

  const grandTotalItems = result.reduce(
    (sum, day) => sum + Number(day.total_items || 0),
    0,
  );

  const grandTotalSellingAmount = result.reduce(
    (sum, day) => sum + Number(day.total_selling_amount || 0),
    0,
  );

  return {
    start_date: startDate,

    end_date: endDate,

    days: result,

    total_days: result.length,

    total_items: grandTotalItems,

    total_selling_amount: grandTotalSellingAmount,
  };
}

module.exports = {
  getInventoryProducts,
  getUsageByDate,
  getUsageHistory,
  saveUsageItem,
  revertUsageItem,
  getSellingHistoryByDateRange,
};
