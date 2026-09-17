const express = require("express");
const router = express.Router();

const clothesController = require("../controllers/clothesController");
const uploadClothesImages = require("../middleware/uploadClothesImages");

router.get("/getClothes", clothesController.getClothes);

router.get("/getClothesById/:id", clothesController.getClothesById);

router.post(
  "/createClothes",
  uploadClothesImages.fields([
    {
      name: "cloth_photo",
      maxCount: 1,
    },
    {
      name: "note_photo",
      maxCount: 1,
    },
  ]),
  clothesController.createClothes,
);

router.put(
  "/updateClothes/:id",
  uploadClothesImages.fields([
    {
      name: "cloth_photo",
      maxCount: 1,
    },
    {
      name: "note_photo",
      maxCount: 1,
    },
  ]),
  clothesController.updateClothes,
);

router.patch("/updateClothesStatus/:id", clothesController.updateClothesStatus);
router.get("/photo/:fileId", clothesController.getClothesPhoto);
module.exports = router;
