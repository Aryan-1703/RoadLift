const axios = require("axios");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const autocomplete = async (req, res) => {
	try {
		const { input } = req.query;

		if (!input || typeof input !== "string") {
			return res.status(400).json({ message: "Invalid or missing input parameter." });
		}

		if (!GOOGLE_MAPS_API_KEY) {
			return res
				.status(500)
				.json({ message: "Server configuration error: Missing API Key." });
		}

		const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
			input,
		)}&key=${GOOGLE_MAPS_API_KEY}&components=country:ca`;

		const response = await axios.get(url, { timeout: 5000 });
		const data = response.data;

		if (data.status === "OK" || data.status === "ZERO_RESULTS") {
			return res.status(200).json(data);
		}

		console.error("Google Places API Error:", data.status, data.error_message);
		return res.status(502).json({ message: "Failed to fetch autocomplete predictions." });
	} catch (error) {
		console.error("Maps Autocomplete Proxy Error:", error.message);
		if (error.code === "ECONNABORTED") {
			return res.status(504).json({ message: "Request to Google API timed out." });
		}
		return res.status(500).json({ message: "Internal server error." });
	}
};

const placeDetails = async (req, res) => {
	try {
		const { placeId } = req.query;

		if (!placeId || typeof placeId !== "string") {
			return res.status(400).json({ message: "Invalid or missing placeId parameter." });
		}

		if (!GOOGLE_MAPS_API_KEY) {
			return res
				.status(500)
				.json({ message: "Server configuration error: Missing API Key." });
		}

		const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
			placeId,
		)}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;

		const response = await axios.get(url, { timeout: 5000 });
		const data = response.data;

		if (data.status === "OK") {
			return res.status(200).json(data);
		}

		console.error("Google Place Details API Error:", data.status, data.error_message);
		return res.status(502).json({ message: "Failed to fetch place details." });
	} catch (error) {
		console.error("Maps Place Details Proxy Error:", error.message);
		if (error.code === "ECONNABORTED") {
			return res.status(504).json({ message: "Request to Google API timed out." });
		}
		return res.status(500).json({ message: "Internal server error." });
	}
};

const reverseGeocode = async (req, res) => {
	try {
		const { lat, lng } = req.query;

		if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
			return res
				.status(400)
				.json({ message: "Valid latitude and longitude are required." });
		}

		if (!GOOGLE_MAPS_API_KEY) {
			return res
				.status(500)
				.json({ message: "Server configuration error: Missing API Key." });
		}

		const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
			lat,
		)},${encodeURIComponent(lng)}&key=${GOOGLE_MAPS_API_KEY}`;

		const response = await axios.get(url, { timeout: 5000 });
		const data = response.data;

		if (data.status === "OK" && data.results.length > 0) {
			return res.status(200).json(data.results);
		} else if (data.status === "ZERO_RESULTS") {
			return res.status(200).json([]);
		}

		console.error("Google Geocoding API Error:", data.status, data.error_message);
		return res.status(502).json({ message: "Failed to fetch reverse geocoding data." });
	} catch (error) {
		console.error("Maps Reverse Geocode Proxy Error:", error.message);
		if (error.code === "ECONNABORTED") {
			return res.status(504).json({ message: "Request to Google API timed out." });
		}
		return res.status(500).json({ message: "Internal server error." });
	}
};

module.exports = {
	autocomplete,
	placeDetails,
	reverseGeocode,
};
