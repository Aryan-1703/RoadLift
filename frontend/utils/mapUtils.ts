import { decode } from "@googlemaps/polyline-codec";

export const getRouteCoordinates = async (
	origin: { latitude: number; longitude: number },
	destination: { latitude: number; longitude: number },
) => {
	try {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			console.warn("Google Maps API key is missing");
			return [];
		}

		const originStr = `${origin.latitude},${origin.longitude}`;
		const destStr = `${destination.latitude},${destination.longitude}`;
		const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${apiKey}`;

		const response = await fetch(url);
		const json = await response.json();

		if (json.routes && json.routes.length > 0) {
			const points = json.routes[0].overview_polyline.points;
			// Decode returns an array of [latitude, longitude] tuples
			const decoded = decode(points);
			return decoded.map(point => ({
				latitude: point[0],
				longitude: point[1],
			}));
		}
		return [];
	} catch (error) {
		console.error("Error fetching route coordinates:", error);
		return [];
	}
};
