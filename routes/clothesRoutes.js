const express = require("express");
const router = express.Router();

const clothesController = require("../controllers/clothesController");
const uploadClothesImages = require("../middleware/uploadClothesImages");
const middleware = require("../middleware/authenticate");

router.get("/getClothes", middleware, clothesController.getClothes);

router.get("/getClothesById/:id", middleware, clothesController.getClothesById);

router.post(
  "/createClothes",
  middleware,
  uploadClothesImages.any(),
  clothesController.createClothes,
);

router.put(
  "/updateClothes/:id",
  middleware,
  uploadClothesImages.any(),
  clothesController.updateClothes,
);

router.patch(
  "/updateClothesStatus/:id",
  middleware,
  clothesController.updateClothesStatus,
);
router.get("/photo/:fileId", middleware, clothesController.getClothesPhoto);
router.get("/getAllCustomers", middleware, clothesController.getAllCustomers);
router.get(
  "/:id/getCustomerOrders",
  middleware,
  clothesController.getCustomerOrders,
);

router.get("/getOrderById/:id", clothesController.getOrderById);
module.exports = router;
