// utils/getDrivingDistance.js
const axios = require("axios");
require("dotenv").config();

async function getDrivingDistance(origin, destination) {
	if (!origin || !destination) {
		console.error("🚫 Missing origin or destination:", { origin, destination });
		throw new Error("Missing origin or destination");
	}

	const originStr = `${origin.lat},${origin.lng}`;
	const destinationStr = `${destination.lat},${destination.lng}`;

	const apiKey = process.env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) {
		console.error("🚫 Google Maps API key not found in environment");
		throw new Error("Google Maps API key not found in environment");
	}

	const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${apiKey}`;

	try {
		const response = await axios.get(url);

		if (
			response.data.status !== "OK" ||
			!response.data.routes.length ||
			!response.data.routes[0].legs.length
		) {
			console.error("❌ No routes found in response");
			throw new Error("No routes found");
		}

		const leg = response.data.routes[0].legs[0];

		return {
			distanceText: leg.distance.text,
			distanceValue: leg.distance.value,
			durationText: leg.duration.text,
			durationValue: leg.duration.value,
		};
	} catch (error) {
		console.error("❌ Error fetching driving distance:", error.message);
		throw error;
	}
}

module.exports = getDrivingDistance;
