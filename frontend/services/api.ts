import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Automatically inject JWT Token
apiClient.interceptors.request.use(
	async config => {
		try {
			const storedUser = await AsyncStorage.getItem("@roadlift_user");
			if (storedUser) {
				const user = JSON.parse(storedUser);
				if (user.token) {
					config.headers.Authorization = `Bearer ${user.token}`;
				}
			}
		} catch (e) {
			console.warn("Failed to fetch token for request");
		}
		return config;
	},
	error => Promise.reject(error),
);

// Fallback interceptor for endpoints that aren't built on the backend yet
apiClient.interceptors.response.use(
	response => response,
	async error => {
		const config = error.config;
		if (!config || !config.url) return Promise.reject(error);

		const endpoint = config.url.replace(API_URL, "");

		// Temporary mocks to prevent UI crashes while backend is being finished
		if (endpoint === "/users/profile" && config.method === "put") {
			return new Promise(resolve =>
				setTimeout(() => resolve({ data: { success: true, user: JSON.parse(config.data) } }), 1000)
			);
		}
		if (endpoint === "/users/preferences" && config.method === "get") {
			return Promise.resolve({
				data: { push: true, sms: true, emailReceipts: true, promotions: false },
			});
		}
		if (endpoint === "/users/sessions" && config.method === "get") {
			return Promise.resolve({
				data: [
					{
						id: "sess_1",
						device: "Current Device",
						location: "Local",
						lastActive: "Now",
						isCurrent: true,
					},
				],
			});
		}
		if (endpoint === "/users/vehicles" && config.method === "get") {
			return Promise.resolve({ data: [] });
		}
		if (endpoint === "/users/payments" && config.method === "get") {
			return Promise.resolve({ data: [] });
		}
		if (endpoint === "/payment/charge" && config.method === "post") {
			return new Promise(resolve =>
				setTimeout(() => resolve({ data: { success: true } }), 1000),
			);
		}
		if (endpoint === "/jobs/complete" && config.method === "post") {
			return Promise.resolve({ data: { success: true } });
		}

		return Promise.reject(error);
	},
);

// Map the old api mock structure to the new Axios instance
export const api = {
	get: async <T>(endpoint: string) => apiClient.get<T>(endpoint),
	post: async <T>(endpoint: string, data?: any) => apiClient.post<T>(endpoint, data),
	put: async <T>(endpoint: string, data: any) => apiClient.put<T>(endpoint, data),
	delete: async <T>(endpoint: string) => apiClient.delete<T>(endpoint),
};
