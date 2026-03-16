import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// ─────────────────────────────────────────────────────────────────────────────
// How notifications behave when the app is in the FOREGROUND
// ─────────────────────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

/**
 * Requests notification permission and returns the Expo push token string,
 * or null if permission was denied or the device is a simulator.
 *
 * Call this once after login (AuthContext) and store the result on the user
 * record via POST /api/driver/store-push-token.
 */
export async function registerForPushNotifications(): Promise<string | null> {
	// Push notifications only work on real hardware
	if (!Device.isDevice) {
		console.log("[Notifications] Skipping push setup — not a real device.");
		return null;
	}

	// Check / request permission
	const { status: existing } = await Notifications.getPermissionsAsync();
	let finalStatus = existing;

	if (existing !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		// Don't alert — silent degradation is better UX than nagging
		console.log("[Notifications] Permission not granted.");
		return null;
	}

	// Android requires a notification channel
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "RoadLift",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#1A6BFF",
		});
	}

	try {
		const tokenData = await Notifications.getExpoPushTokenAsync({
			projectId: "ad2db119-04d3-4517-be8a-4b4de6194806", // from app.json extra.eas.projectId
		});
		console.log("[Notifications] Push token:", tokenData.data);
		return tokenData.data;
	} catch (err) {
		console.warn("[Notifications] Failed to get push token:", err);
		return null;
	}
}
