const ClothesOrder = require("../models/ClothesOrder");
const Customer = require("../models/Customer");
const { getDrivePhotoUrls } = require("./clothesService");

async function getDashboardData() {
  try {
    const clothes = await ClothesOrder.findAll({
      order: [["id", "DESC"]],

      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "customer_name", "contact"],
        },
      ],
    });

    const activeClothes = clothes.filter((item) => item.status !== "delivered");

    const pending = clothes.filter((item) => item.status === "pending");

    const ready = clothes.filter((item) => item.status === "ready");

    // -----------------------------
    // TODAY YYYY-MM-DD
    // -----------------------------
    const today = new Date();

    const todayValue = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const passed = [];
    const todayReminders = [];
    const upcoming = [];

    // -----------------------------
    // BUILD REMINDER DATA
    // -----------------------------
    clothes.forEach((item) => {
      if (!item.remainder_date) {
        return;
      }

      const reminderDate = String(item.remainder_date).slice(0, 10);

      const customer = item.customer || {};

      const reminderItem = {
        id: item.id,

        customer_id: customer.id || null,

        customer_name: customer.customer_name || item.customer_name || "",

        contact: customer.contact || item.contact || "",

        // IMPORTANT:
        // These are converted into the same photo object
        // used by Clothes.jsx
        cloth_photo: getDrivePhotoUrls(item.cloth_photo),
        note_photo: getDrivePhotoUrls(item.note_photo),

        remainder_date: item.remainder_date,
        delivery_date: item.delivery_date,

        status: item.status,
      };

      // ---------------------------------
      // PASSED + STILL PENDING
      // ---------------------------------
      if (reminderDate < todayValue && item.status === "pending") {
        passed.push({
          ...reminderItem,
          reminder_status: "passed",
        });

        return;
      }

      // ---------------------------------
      // REMINDER IS TODAY
      // Show every non-delivered order
      // ---------------------------------
      if (reminderDate === todayValue && item.status !== "delivered") {
        todayReminders.push({
          ...reminderItem,
          reminder_status: "today",
        });

        return;
      }

      // ---------------------------------
      // UPCOMING
      // Keep this for dashboard count
      // but don't display it in reminder list
      // ---------------------------------
      if (reminderDate > todayValue && item.status !== "delivered") {
        upcoming.push({
          ...reminderItem,
          reminder_status: "upcoming",
        });
      }
    });

    // -----------------------------
    // SORT
    // -----------------------------

    passed.sort((a, b) => {
      return String(a.remainder_date)
        .slice(0, 10)
        .localeCompare(String(b.remainder_date).slice(0, 10));
    });

    todayReminders.sort((a, b) => {
      return String(a.delivery_date || "")
        .slice(0, 10)
        .localeCompare(String(b.delivery_date || "").slice(0, 10));
    });

    upcoming.sort((a, b) => {
      return String(a.remainder_date)
        .slice(0, 10)
        .localeCompare(String(b.remainder_date).slice(0, 10));
    });

    // -----------------------------
    // RESPONSE
    // -----------------------------

    return {
      summary: {
        totalClothes: activeClothes.length,
        pending: pending.length,
        ready: ready.length,

        passedReminders: passed.length,
        todayReminders: todayReminders.length,
        upcomingReminders: upcoming.length,
      },

      reminders: {
        passed,
        today: todayReminders,

        // We keep this for the summary count,
        // but Dashboard.jsx won't display these.
        upcoming,
      },
    };
  } catch (error) {
    console.error("Dashboard service error:", error);
    throw error;
  }
}

module.exports = {
  getDashboardData,
};
