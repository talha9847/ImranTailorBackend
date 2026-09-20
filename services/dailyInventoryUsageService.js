const {
  Inventory,
  DailyInventoryUsage,
  DailyInventoryUsageItem,
} = require("../models/association");

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
module.exports = {
  getInventoryProducts,
  getUsageByDate,
  getUsageHistory,
  saveUsageItem,
  revertUsageItem,
};
