const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const { protect } = require("../middleware/authMiddleware");

// Protect all vehicle routes
router.use(protect);

router.post("/", vehicleController.addVehicle);
router.get("/", vehicleController.getVehicles);
router.put("/set-default", vehicleController.setAsDefault);
router.delete("/:vehicleId", vehicleController.deleteVehicle);

module.exports = router;
