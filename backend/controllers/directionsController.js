const { getRouteFromGoogle } = require("../services/googleMapsService");

const getDirections = async (req, res) => {
	try {
		const { from, to } = req.query;

		if (!from || !to) {
			return res.status(400).json({ error: "Missing 'from' or 'to' query parameters" });
		}

		const [fromLat, fromLng] = from.split(",").map(Number);
		const [toLat, toLng] = to.split(",").map(Number);

		const origin = { lat: fromLat, lng: fromLng };
		const destination = { lat: toLat, lng: toLng };

		const routeInfo = await getRouteFromGoogle(origin, destination);
		return res.json(routeInfo);
	} catch (error) {
		console.error("Directions Error:", error.message);
		res.status(500).json({ error: "Failed to get directions" });
	}
};

const getDirectionsForMap = async (req, res) => {
	try {
		const { originLat, originLng, destLat, destLng } = req.query;

		if (!originLat || !originLng || !destLat || !destLng) {
			return res.status(400).json({ error: "Missing originLat, originLng, destLat, or destLng" });
		}

		const origin      = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
		const destination = { lat: parseFloat(destLat),   lng: parseFloat(destLng)   };

		const routeInfo = await getRouteFromGoogle(origin, destination);
		return res.json({ polyline: routeInfo.encodedPolyline });
	} catch (error) {
		console.error("Directions (map) Error:", error.message);
		res.status(500).json({ error: "Failed to get directions" });
	}
};

module.exports = {
	getDirections,
	getDirectionsForMap,
};
