const axios = require("axios");

const getRouteFromGoogle = async (origin, destination) => {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY;

	const url = `https://maps.googleapis.com/maps/api/directions/json`;
	const params = {
		origin: `${origin.lat},${origin.lng}`,
		destination: `${destination.lat},${destination.lng}`,
		key: apiKey,
		mode: "driving",
	};
	
	const response = await axios.get(url, { params });
	console.log(response)

	if (response.data.status !== "OK") {
		throw new Error(`Google Maps error: ${response.data.status}`);
	}

	const route = response.data.routes[0];
	const leg = route.legs[0];

	return {
		distanceText: leg.distance.text,
		durationText: leg.duration.text,
		encodedPolyline: route.overview_polyline.points,
	};
};

module.exports = {
	getRouteFromGoogle,
};
