// At the top of the file, load the environment variables from your .env file
require("dotenv").config();

// Export a function that returns your configuration object
export default ({ config }) => {
	// config is the existing static configuration from expo
	return {
		...config,

		name: "TowLink",
		slug: "TowLink",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: "TowLink",
		userInterfaceStyle: "automatic",
		web: {
			bundler: "metro",
			output: "static",
			favicon: "./assets/images/favicon.png",
		},
		plugins: [
			"expo-router",
			[
				"expo-splash-screen",
				{
					image: "./assets/images/splash-icon.png",
					imageWidth: 200,
					resizeMode: "contain",
					backgroundColor: "#ffffff",
				},
			],
			[
				"expo-notifications",
				{
					icon: "./assets/images/notification-icon.png",
					color: "#ffffff",
					sounds: [],
				},
			],
		],
		experiments: {
			typedRoutes: true,
		},
		extra: {
			...config.extra, // Spread any extra config from plugins etc.
			router: {},
			eas: {
				projectId: "91e4237a-aa54-4ef7-a29d-2bc0cfa3683e",
			},
		},
		owner: "aryan1703",

		// --- DYNAMICALLY CONFIGURED SECTIONS ---
		android: {
			...config.android, // Spread existing android properties
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			edgeToEdgeEnabled: true,
			// Add the config object for Google Maps API key
			config: {
				googleMaps: {
					apiKey: process.env.GOOGLE_MAPS_API_KEY,
				},
			},
		},
		ios: {
			...config.ios, // Spread existing ios properties
			bundleIdentifier: "com.aryan1703.TowLink",
			supportsTablet: true,
			// Add the config object for Google Maps API key
			config: {
				googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
			},
			infoPlist: {
				UIBackgroundModes: ["remote-notification", "fetch"],
				NSUserTrackingUsageDescription:
					"We use notifications to keep you updated about towing jobs and services.",
				NSLocationWhenInUseUsageDescription:
					"This app needs access to your location to track towing jobs in real-time.",
				NSLocationAlwaysAndWhenInUseUsageDescription:
					"Location access is required to provide live updates even when the app is in background.",
				ITSAppUsesNonExemptEncryption: false,
			},
		},
	};
};
