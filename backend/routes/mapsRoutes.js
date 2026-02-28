const express = require("express");
const router = express.Router();
const {
	autocomplete,
	placeDetails,
	reverseGeocode,
} = require("../controllers/mapsController");
const { protect } = require("../middleware/authMiddleware");
const rateLimiter = require("../middleware/rateLimiter");

// Rate limit: Max 30 requests per minute per IP for Maps APIs
const mapsLimiter = rateLimiter({
	windowMs: 60 * 1000, // 1 minute
	max: 30,
	message: "Too many requests to Maps API, please try again later.",
});

// GET /api/maps/autocomplete?input=...
router.get("/autocomplete", protect, mapsLimiter, autocomplete);

// GET /api/maps/place-details?placeId=...
router.get("/place-details", protect, mapsLimiter, placeDetails);

// GET /api/maps/reverse-geocode?lat=...&lng=...
router.get("/reverse-geocode", protect, mapsLimiter, reverseGeocode);

module.exports = router;
