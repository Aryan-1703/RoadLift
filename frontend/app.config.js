require("dotenv").config();
// Export a function that returns your configuration object
export default ({ config }) => {
	// config is the existing static configuration from expo
	return {
		...config,

		name: "RoadLift",
		slug: "roadlift",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: "roadlift", // Corrected the casing to be consistent
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
			[
				"expo-payments-stripe",
				{
					// 2. Pass the merchantIdentifier here
					merchantIdentifier: "merchant.ca.roadlift",

					// 3. We also need to add our Stripe Publishable Key here.
					publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
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
			package: "ca.roadlift.app", // Recommended to add package name
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
							host: "ca.roadlift.app",
							pathPrefix: "/stripe-onboarding",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},
		ios: {
			...config.ios,
			bundleIdentifier: "ca.roadlift.app",
			supportsTablet: true,
			associatedDomains: ["applinks:roadlift.ca"],
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
				// ✅ Apple Pay usage description (optional, but recommended)
				NSAppleMusicUsageDescription:
					"This app uses Apple Pay to let you make fast and secure payments.",
			},
		},
	};
};
