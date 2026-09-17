// =========================================================
// GET DASHBOARD DATA
// =========================================================

const ClothesOrder = require("../models/ClothesOrder");

async function getDashboardData() {
  try {
    const clothes = await ClothesOrder.findAll({
      order: [["id", "DESC"]],
    });

    // -------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------

    const activeClothes = clothes.filter((item) => item.status !== "delivered");

    const pending = clothes.filter((item) => item.status === "pending");

    const ready = clothes.filter((item) => item.status === "ready");

    // -------------------------------------------------------
    // TODAY
    // -------------------------------------------------------

    const today = new Date();

    const todayValue = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    // -------------------------------------------------------
    // REMINDERS
    // -------------------------------------------------------

    const passed = [];
    const todayReminders = [];
    const upcoming = [];

    clothes.forEach((item) => {
      // Delivered orders are not active reminders.
      if (item.status === "delivered") {
        return;
      }

      if (!item.remainder_date) {
        return;
      }

      const reminderDate = String(item.remainder_date).slice(0, 10);

      /*
       * IMPORTANT:
       *
       * Keep cloth_photo and note_photo exactly as they
       * come from Clothes service/model.
       *
       * They contain:
       * {
       *   id,
       *   thumbnail,
       *   url
       * }
       *
       * Dashboard.jsx will use thumbnail for display.
       */

      const reminderItem = {
        id: item.id,

        customer_name: item.customer_name,
        contact: item.contact,

        cloth_photo: item.cloth_photo,
        note_photo: item.note_photo,

        remainder_date: item.remainder_date,
        delivery_date: item.delivery_date,

        status: item.status,
      };

      if (reminderDate < todayValue) {
        passed.push({
          ...reminderItem,
          reminder_status: "passed",
        });

        return;
      }

      if (reminderDate === todayValue) {
        todayReminders.push({
          ...reminderItem,
          reminder_status: "today",
        });

        return;
      }

      upcoming.push({
        ...reminderItem,
        reminder_status: "upcoming",
      });
    });

    // -------------------------------------------------------
    // SORT
    // -------------------------------------------------------

    passed.sort(
      (a, b) => new Date(a.remainder_date) - new Date(b.remainder_date),
    );

    todayReminders.sort(
      (a, b) => new Date(a.delivery_date || 0) - new Date(b.delivery_date || 0),
    );

    upcoming.sort(
      (a, b) => new Date(a.remainder_date) - new Date(b.remainder_date),
    );

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

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
        upcoming,
      },
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getDashboardData,
};
