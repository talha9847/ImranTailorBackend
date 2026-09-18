const express = require("express");
const router = express.Router();

const clothesController = require("../controllers/clothesController");
const uploadClothesImages = require("../middleware/uploadClothesImages");

router.get("/getClothes", clothesController.getClothes);

router.get("/getClothesById/:id", clothesController.getClothesById);

router.post(
  "/createClothes",
  uploadClothesImages.any(),
  clothesController.createClothes,
);

router.put(
  "/updateClothes/:id",
  uploadClothesImages.any(),
  clothesController.updateClothes,
);

router.patch("/updateClothesStatus/:id", clothesController.updateClothesStatus);
router.get("/photo/:fileId", clothesController.getClothesPhoto);
module.exports = router;
