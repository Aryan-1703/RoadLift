const express = require("express");
const router = express.Router();
const { getDirections } = require("../controllers/directionsController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

router.get("/get-directions", protect, protectDriver, getDirections);

module.exports = router;
