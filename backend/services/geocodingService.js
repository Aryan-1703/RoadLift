// In backend/services/geocodingService.js
const axios = require("axios");
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Converts latitude and longitude into a human-readable address using Google's API.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} A formatted address string.
 */
async function reverseGeocode(latitude, longitude) {
	if (!GOOGLE_MAPS_API_KEY) {
		throw new Error("Google Maps API key is not configured on the server.");
	}

	const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

	try {
		const response = await axios.get(url);
		if (response.data.status === "OK" && response.data.results[0]) {
			// Find the most suitable address, often the first result is best
			const address = response.data.results[0].formatted_address;
			// Get a shorter, more readable version
			const shortAddress = address.split(",").slice(0, 2).join(", ");
			return shortAddress;
		} else {
			console.warn(
				"Google Geocoding failed:",
				response.data.status,
				response.data.error_message
			);
			return "Address not found";
		}
	} catch (error) {
		console.error("Error calling Google Geocoding API:", error.message);
		throw new Error("Failed to fetch address from Google Maps.");
	}
}

// NEW function for places autocomplete
async function placesAutocomplete(query) {
	if (!GOOGLE_MAPS_API_KEY) {
		throw new Error("Google Maps API key is not configured.");
	}
	// Add component restrictions to prefer results in a specific country if desired
	// Example for Canada: &components=country:ca
	const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
		query
	)}&key=${GOOGLE_MAPS_API_KEY}&components=country:ca`;

	try {
		const response = await axios.get(url);
		// We will now return the entire data object and let the controller handle it
		return response.data;
	} catch (error) {
		console.error("Google Autocomplete API call failed:", error.message);
		// Return a valid empty structure on failure
		return { predictions: [], status: "API_ERROR" };
	}
}

// NEW function to get details (lat/lon) for a place
async function getPlaceDetails(placeId) {
	const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`;
	const response = await axios.get(url);
	return response.data;
}

module.exports = { reverseGeocode, placesAutocomplete, getPlaceDetails };
