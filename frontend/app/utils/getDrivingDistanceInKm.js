import axios from "axios";
import { API_URL } from "../config/constants";

/**
 * Calls backend API to get driving distance between two points (in km)
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Promise<number>} distance in kilometers
 */
const getDrivingDistanceInKm = async (originLat, originLng, destLat, destLng) => {
	try {
		const response = await axios.get(`${API_URL}/utils/distance`, {
			params: { originLat, originLng, destLat, destLng },
		});
		//convert to km
		return response.data.distanceValue / 1000;
	} catch (error) {
		console.error("Failed to fetch driving distance:", error);
		return Infinity; // So you can filter out jobs if error occurs
	}
};

export default getDrivingDistanceInKm;
