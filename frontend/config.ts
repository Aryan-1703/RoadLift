	//   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
const rawUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawUrl && __DEV__) {
	console.warn(
		"[config] EXPO_PUBLIC_API_URL is not set. " +
		"Create frontend/.env and add EXPO_PUBLIC_API_URL=http://<your-ip>:3000",
	);
}

// Strip trailing slash so callers can safely append /api/...
export const BACKEND_URL = (rawUrl ?? "http://localhost:3000").replace(/\/$/, "");

export const API_URL = `${BACKEND_URL}/api`;
