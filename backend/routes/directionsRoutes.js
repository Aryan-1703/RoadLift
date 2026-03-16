const express = require("express");
const router = express.Router();
const { getDirections, getDirectionsForMap } = require("../controllers/directionsController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

// Legacy driver-only route
router.get("/get-directions", protect, protectDriver, getDirections);

// Map polyline route — used by LiveMap on both customer and driver screens
// Accepts: ?originLat=&originLng=&destLat=&destLng=
// Returns: { polyline: string }
router.get("/", protect, getDirectionsForMap);

module.exports = router;
