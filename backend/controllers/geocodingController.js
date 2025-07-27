const geocodingService = require("../services/geocodingService");

const getAddress = async (req, res) => {
	try {
		const { lat, lon } = req.query; // Get lat/lon from query parameters
		if (!lat || !lon) {
			return res.status(400).json({ message: "Latitude and longitude are required." });
		}
		const address = await geocodingService.reverseGeocode(lat, lon);
		res.status(200).json({ address });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const placesAutocomplete = async (req, res) => {
	try {
		const { query } = req.query;
		if (!query) {
			return res.json([]);
		}

		const googleResponse = await geocodingService.placesAutocomplete(query);

		if (googleResponse && Array.isArray(googleResponse.predictions)) {
			// Filter only valid predictions
			const cleanPredictions = googleResponse.predictions
				.filter(item => item.description && item.place_id)
				.map(item => ({
					description: item.description,
					place_id: item.place_id,
				}));

			res.json(cleanPredictions);
		} else {
			res.json([]);
		}
	} catch (error) {
		console.error("Error in placesAutocomplete controller:", error);
		res.status(500).json([]);
	}
};

const getPlaceDetails = async (req, res) => {
	try {
		const { placeId } = req.query;
		const data = await geocodingService.getPlaceDetails(placeId);
		res.json(data.result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
module.exports = { getAddress, placesAutocomplete, getPlaceDetails };
