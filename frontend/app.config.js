require("dotenv").config();

// Export a function that returns your configuration object
export default ({ config }) => {
	return {
		// Spread the base config to inherit properties like sdkVersion
		...config,

		name: "RoadLift",
		slug: "roadlift",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: "roadlift",
		userInterfaceStyle: "automatic",
		owner: "aryan1703",

		splash: {
			image: "./assets/images/splash-icon.png", // Correct place for splash config
			resizeMode: "contain",
			backgroundColor: "#ffffff",
		},

		assetBundlePatterns: ["**/*"],

		// --- EAS BUILD CONFIG ---
		extra: {
			eas: {
				projectId: "3412f98a-3504-4fd8-a389-7e6c658f0744", // Your project ID
			},
		},

		// --- PLUGINS SECTION ---
		// This is where all native module configurations go.
		plugins: [
			"expo-router",
			[
				"expo-notifications",
				{
					icon: "./assets/images/notification-icon.png",
					color: "#ffffff",
					sounds: [], // Correctly added to prevent build errors
				},
			],
			// Best practice to include expo-location here too
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission:
						"RoadLift needs your location to connect you with nearby drivers.",
				},
			],
			// [
			// 	"expo-payments-stripe",
			// 	{
			// 		merchantIdentifier: "merchant.ca.roadlift",
			// 		publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
			// 		urlScheme: "roadlift",
			// 	},
			// ],
		],

		// --- PLATFORM-SPECIFIC CONFIGURATIONS ---
		ios: {
			bundleIdentifier: "ca.roadlift.app",
			supportsTablet: true,
			config: {
				googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
			},
			infoPlist: {
				NSLocationWhenInUseUsageDescription:
					"RoadLift needs your location to find nearby help and for drivers to navigate to you.",
				NSLocationAlwaysAndWhenInUseUsageDescription:
					"Location access allows drivers to update you with their live position, even when the app is in the background.",
				ITSAppUsesNonExemptEncryption: false, // ← ✅ ADD THIS LINE
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			package: "ca.roadlift.app",
			config: {
				googleMaps: {
					apiKey: process.env.GOOGLE_MAPS_API_KEY,
				},
			},
		},
	};
};
