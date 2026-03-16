import { decode } from "@googlemaps/polyline-codec";
import { api } from "../services/api";

/**
 * Fetches a driving route between two coordinates via the RoadLift backend
 * proxy (which calls Google Maps Directions API server-side).
 *
 * @returns Array of { latitude, longitude } coordinate pairs for the polyline.
 */
export const getRouteCoordinates = async (
	origin: { latitude: number; longitude: number },
	destination: { latitude: number; longitude: number },
): Promise<{ latitude: number; longitude: number }[]> => {
	try {
		// FIX: was calling Google directly; now uses backend proxy endpoint.
		// Backend: GET /api/directions?originLat=...&originLng=...&destLat=...&destLng=...
		const res = await api.get<{ polyline: string }>("/direction", {
			params: {
				originLat: origin.latitude,
				originLng: origin.longitude,
				destLat: destination.latitude,
				destLng: destination.longitude,
			},
		});

		const polyline = res.data?.polyline;
		if (!polyline) return [];

		// Decode Google's encoded polyline → [{latitude, longitude}]
		const decoded = decode(polyline);
		return decoded.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
	} catch (err) {
		console.warn("[mapUtils] getRouteCoordinates failed:", err);
		return [];
	}
};
