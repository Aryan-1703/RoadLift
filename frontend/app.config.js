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
		scheme: "towlink", // Corrected the casing to be consistent
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
			...config.extra,
			router: {},
			eas: {
				projectId: "91e4237a-aa54-4ef7-a29d-2bc0cfa3683e",
			},
		},
		owner: "aryan1703",

		// --- DYNAMICALLY CONFIGURED SECTIONS ---
		android: {
			...config.android,
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			package: "com.aryan1703.TowLink", // Recommended to add package name
			edgeToEdgeEnabled: true,
			config: {
				googleMaps: {
					apiKey: process.env.GOOGLE_MAPS_API_KEY,
				},
			},
			// --- NEW: App Links Configuration for Android ---
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							// Replace 'app.tow.link' with your actual domain
							host: "app.tow.link",
							pathPrefix: "/stripe-onboarding",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},
		ios: {
			...config.ios,
			bundleIdentifier: "com.aryan1703.TowLink",
			supportsTablet: true,
			// --- NEW: Universal Links Configuration for iOS ---
			associatedDomains: ["applinks:app.tow.link"], // Replace with your domain
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
