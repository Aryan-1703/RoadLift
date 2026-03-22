// routes/utils.js
const express = require("express");
const getDrivingDistance = require("../utils/getDrivingDistance");
const { getSettings } = require("../utils/settingsCache");
const router = express.Router();

router.get("/distance", async (req, res) => {
	const { originLat, originLng, destLat, destLng } = req.query;

	if (!originLat || !originLng || !destLat || !destLng) {
		return res.status(400).json({ message: "Missing query params" });
	}

	try {
		const distanceData = await getDrivingDistance(
			{ lat: originLat, lng: originLng },
			{ lat: destLat, lng: destLng }
		);

		res.json(distanceData);
	} catch (err) {
		console.error("Error in /utils/distance:", err);
		res.status(500).json({ message: "Internal server error" });
	}
});

// GET /api/utils/pricing — public, no auth required
// Returns service base prices so the customer app can show live rates.
router.get("/pricing", async (req, res) => {
	try {
		const settings = await getSettings();
		const p = settings.pricing || {};
		// Map admin pricing keys to customer service IDs
		res.json({
			"battery-boost": { base: p.battery?.base ?? 60, perKm: p.battery?.perKm ?? 2 },
			"car-lockout":   { base: p.lockout?.base ?? 75, perKm: p.lockout?.perKm ?? 2 },
			"fuel-delivery": { base: p.fuel?.base    ?? 55, perKm: p.fuel?.perKm    ?? 2 },
			"tire-change":   { base: p.tire?.base    ?? 65, perKm: p.tire?.perKm    ?? 2 },
			"towing":        { base: 85, perKm: 0 }, // not in admin settings yet — static
		});
	} catch (err) {
		console.error("[Utils] /pricing:", err.message);
		res.status(500).json({ message: "Server error." });
	}
});

module.exports = router;
