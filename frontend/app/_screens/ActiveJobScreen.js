import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	Alert,
	TouchableOpacity,
	Linking,
	Platform,
	StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { FontAwesome5 } from "@expo/vector-icons";
import ModalHeader from "../_components/ModalHeader";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { API_URL } from "../config/constants";
import { useAuth } from "../_context/AuthContext";
import { useSocket } from "../_context/SocketContext";

const ActiveJobScreen = () => {
	// --- HOOKS & STATE ---
	const { jobId } = useLocalSearchParams();
	const router = useRouter();
	const { token } = useAuth(); // Use AuthContext for the token
	const { socket } = useSocket();
	const { theme } = useTheme();

	const [job, setJob] = useState(null);
	const [driverLocation, setDriverLocation] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const locationSubscription = useRef(null);

	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- EFFECT TO LOAD JOB AND START TRACKING ---
	useEffect(() => {
		const loadJobAndStartTracking = async () => {
			if (!jobId || !token) {
				setIsLoading(false);
				return;
			}
			try {
				// Fetch job details
				const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setJob(response.data);

				// Start watching the driver's position
				locationSubscription.current = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.BestForNavigation,
						timeInterval: 5000, // 5 seconds
						distanceInterval: 10, // 10 meters
					},
					loc => {
						const newLocation = loc.coords;
						setDriverLocation(newLocation);

						// Send location update to backend via socket
						if (socket && socket.connected) {
							socket.emit("driver-location-update", {
								jobId: jobId,
								location: {
									latitude: newLocation.latitude,
									longitude: newLocation.longitude,
								},
							});
						}
					}
				);
			} catch (error) {
				console.error("Failed to load job details:", error);
				Alert.alert("Error", "Failed to load job details.");
			} finally {
				setIsLoading(false);
			}
		};

		loadJobAndStartTracking();

		// Cleanup function to stop watching location when the screen is unmounted
		return () => {
			if (locationSubscription.current) {
				locationSubscription.current.remove();
			}
		};
	}, [jobId, token, socket]);

	// --- HANDLERS ---
	const openMaps = () => {
		if (!job) return;
		const { coordinates } = job.pickupLocation;
		const [lon, lat] = coordinates;
		const url = Platform.select({
			ios: `maps:?daddr=${lat},${lon}`,
			android: `geo:0,0?q=${lat},${lon}(Customer)`,
		});
		if (url) Linking.openURL(url);
	};

	const handleCompleteJob = () => {
		Alert.alert("Complete Job", "Are you sure you have completed this service?", [
			{ text: "Not Yet", style: "cancel" },
			{
				text: "Yes, Job is Done",
				onPress: async () => {
					try {
						// Use the token from AuthContext
						await axios.put(
							`${API_URL}/driver/jobs/${jobId}/complete`,
							{},
							{ headers: { Authorization: `Bearer ${token}` } }
						);
						Alert.alert("Success", "Job marked as complete!");
						router.back();
					} catch (error) {
						Alert.alert("Error", "Failed to mark job as complete.");
					}
				},
			},
		]);
	};

	// --- RENDER ---
	if (isLoading || !job) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.tint} />
			</View>
		);
	}

	const { pickupLocation, serviceType, User, notes } = job;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Active Job" />

			<MapView
				style={styles.map}
				provider={PROVIDER_GOOGLE} // Explicitly use Google Maps
				initialRegion={{
					latitude: pickupLocation.coordinates[1],
					longitude: pickupLocation.coordinates[0],
					latitudeDelta: 0.05,
					longitudeDelta: 0.05,
				}}
				customMapStyle={isDarkMode ? mapStyleDark : []}
			>
				{/* Customer Location Marker */}
				<Marker
					coordinate={{
						latitude: pickupLocation.coordinates[1],
						longitude: pickupLocation.coordinates[0],
					}}
					title="Customer Location"
				>
					<FontAwesome5 name="map-pin" size={30} color="#34c759" />
				</Marker>

				{/* Driver's Live Location Marker */}
				{driverLocation && (
					<Marker coordinate={driverLocation} title="Your Location">
						<FontAwesome5 name="truck" size={30} color={colors.tint} />
					</Marker>
				)}
			</MapView>

			<View
				style={[
					styles.detailsContainer,
					{ backgroundColor: colors.card, borderTopColor: colors.border },
				]}
			>
				<Text style={[styles.serviceType, { color: colors.text }]}>
					{serviceType.replace("-", " ").toUpperCase()}
				</Text>
				<Text style={[styles.detailText, { color: colors.text }]}>
					Customer: {User.name}
				</Text>
				{notes && (
					<Text style={[styles.detailText, { color: colors.text, fontStyle: "italic" }]}>
						Notes: {notes}
					</Text>
				)}

				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={openMaps}
				>
					<FontAwesome5 name="directions" size={20} color="#fff" />
					<Text style={styles.buttonText}>Get Directions</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.button, { backgroundColor: "#34c759", marginTop: 10 }]}
					onPress={handleCompleteJob}
				>
					<FontAwesome5 name="check-circle" size={20} color="#fff" />
					<Text style={styles.buttonText}>Mark as Complete</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	map: { flex: 1 },
	detailsContainer: { padding: 20, borderTopWidth: 1 },
	serviceType: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
	detailText: { fontSize: 16, marginBottom: 10, lineHeight: 22 },
	button: {
		flexDirection: "row",
		padding: 15,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold", marginLeft: 10 },
});

// --- DARK MAP STYLE ---
const mapStyleDark = [
	{ elementType: "geometry", stylers: [{ color: "#242f3e" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
	{
		featureType: "administrative.locality",
		elementType: "labels.text.fill",
		stylers: [{ color: "#d59563" }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.fill",
		stylers: [{ color: "#d59563" }],
	},
	{ featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
	{
		featureType: "poi.park",
		elementType: "labels.text.fill",
		stylers: [{ color: "#6b9a76" }],
	},
	{ featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#212a37" }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: "#9ca5b3" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#746855" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.stroke",
		stylers: [{ color: "#1f2835" }],
	},
	{
		featureType: "road.highway",
		elementType: "labels.text.fill",
		stylers: [{ color: "#f3d19c" }],
	},
	{ featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
	{
		featureType: "transit.station",
		elementType: "labels.text.fill",
		stylers: [{ color: "#d59563" }],
	},
	{ featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#515c6d" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.stroke",
		stylers: [{ color: "#17263c" }],
	},
];

export default ActiveJobScreen;
