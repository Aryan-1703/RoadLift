// routes/utils.js
const express = require("express");
const getDrivingDistance = require("../utils/getDrivingDistance");
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

module.exports = router;
