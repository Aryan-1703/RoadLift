import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// This configures how notifications behave when the app is in the FOREGROUND.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

/**
 * Asks for permission and gets the unique Expo Push Token for this device.
 * @returns {string|null} The Expo Push Token or null if permission is denied.
 */
export async function registerForPushNotificationsAsync() {
	let token;
	// Push notifications only work on physical devices, not simulators.
	if (!Device.isDevice) {
		alert("Must use a physical device for Push Notifications.");
		return null;
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}
	if (finalStatus !== "granted") {
		alert("Failed to get push token for push notification!");
		return null;
	}

	// Get the token that uniquely identifies this device.
	try {
		const projectId = Constants.expoConfig?.extra?.eas?.projectId;
		if (!projectId) {
			alert("Project ID not found. Make sure you have configured EAS Build.");
			return null;
		}
		token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
	} catch (e) {
		console.error("Failed to get push token", e);
	}

	// This is required for Android notifications to work.
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#FF231F7C",
		});
	}

	return token;
}
