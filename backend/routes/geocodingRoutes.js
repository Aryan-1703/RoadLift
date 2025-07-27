const express = require("express");
const router = express.Router();
const {
	getAddress,
	placesAutocomplete,
	getPlaceDetails,
} = require("../controllers/geocodingController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/geocode/reverse?lat=...&lon=...
// We protect it so only logged-in users can use our API key
router.get("/reverse", protect, getAddress);
router.get("/autocomplete", protect, placesAutocomplete);
router.get("/place-details", protect, getPlaceDetails);

module.exports = router;
