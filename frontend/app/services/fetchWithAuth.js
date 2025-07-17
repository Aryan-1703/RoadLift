import { getToken, clearSession } from "./sessionManager";
import { router } from "expo-router";

const fetchWithAuth = async (url, options = {}) => {
	const token = await getToken();
	const headers = {
		...(options.headers || {}),
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	};

	const res = await fetch(url, { ...options, headers });

	if (res.status === 401) {
		await clearSession();
		router.replace("/login");
		return null;
	}

	return res;
};

export default fetchWithAuth;
