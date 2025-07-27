import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Linking,
	StatusBar,
	TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import axios from "axios";
import { API_URL } from "../config/constants";
import { useAuth } from "../_context/AuthContext";
import { useSocket } from "../_context/SocketContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

const LiveTrackingScreen = () => {
	// --- HOOKS & STATE ---
	const { jobId } = useLocalSearchParams();
	const { token } = useAuth();
	const { socket } = useSocket();
	const { theme } = useTheme();
	const router = useRouter();

	const [driverLocation, setDriverLocation] = useState(null);
	const [jobDetails, setJobDetails] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isJobComplete, setIsJobComplete] = useState(false);
	const mapRef = useRef(null);

	// --- THEME ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- DATA FETCHING & LISTENERS ---
	useEffect(() => {
		const fetchJob = async () => {
			if (!jobId) {
				setIsLoading(false);
				return;
			}
			try {
				const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setJobDetails(response.data);
			} catch (err) {
				Alert.alert("Error", "Failed to load job details.");
			} finally {
				setIsLoading(false);
			}
		};
		fetchJob();
	}, [jobId, token]);

	// Combined effect for all socket listeners
	useEffect(() => {
		if (!socket || !jobId) return;

		const handleLocationUpdate = data => {
			if (String(data.jobId) === String(jobId)) {
				setDriverLocation(data.location);
			}
		};

		const handleJobCompleted = data => {
			if (String(data.jobId) === String(jobId)) {
				console.log("Customer received job-completed event!");
				setIsJobComplete(true);
			}
		};

		socket.on("driver-location-updated", handleLocationUpdate);
		socket.on("job-completed", handleJobCompleted);

		return () => {
			socket.off("driver-location-updated", handleLocationUpdate);
			socket.off("job-completed", handleJobCompleted);
		};
	}, [socket, jobId]);

	// Effect to zoom map to fit both markers
	useEffect(() => {
		if (mapRef.current && jobDetails?.pickupLocation && driverLocation) {
			mapRef.current.fitToCoordinates(
				[
					{
						latitude: jobDetails.pickupLocation.coordinates[1],
						longitude: jobDetails.pickupLocation.coordinates[0],
					},
					driverLocation,
				],
				{
					edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
					animated: true,
				}
			);
		}
	}, [driverLocation, jobDetails]);

	const handleCallDriver = () => {
		if (jobDetails?.Driver?.phoneNumber) {
			Linking.openURL(`tel:${jobDetails.Driver.phoneNumber}`);
		} else {
			Alert.alert("Error", "Driver's phone number is not available.");
		}
	};

	// --- RENDER ---
	if (isLoading) {
		return (
			<SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.tint} />
			</SafeAreaView>
		);
	}

	if (!jobDetails) {
		return (
			<SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
				<Text style={{ color: colors.text }}>Could not load job information.</Text>
			</SafeAreaView>
		);
	}

	if (isJobComplete) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={styles.center}>
					<FontAwesome5 name="check-circle" size={80} color="#34c759" />
					<Text style={[styles.statusText, { color: colors.text, marginTop: 20 }]}>
						Service Complete!
					</Text>
					<Text
						style={[
							styles.subText,
							{ color: colors.tabIconDefault, textAlign: "center" },
						]}
					>
						Thank you for using RoadLift.
					</Text>
					<TouchableOpacity
						style={[styles.button, { backgroundColor: colors.tint, marginTop: 30 }]}
						onPress={() =>
							router.replace({
								pathname: "/rate-experience",
								params: { jobId, driverId: jobDetails?.Driver?.id },
							})
						}
					>
						<Text style={styles.buttonText}>Rate Your Experience</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Main tracking UI
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<MapView
				ref={mapRef}
				style={styles.map}
				provider={PROVIDER_GOOGLE}
				initialRegion={{
					latitude: jobDetails.pickupLocation.coordinates[1],
					longitude: jobDetails.pickupLocation.coordinates[0],
					latitudeDelta: 0.05,
					longitudeDelta: 0.05,
				}}
				customMapStyle={isDarkMode ? mapStyleDark : []}
			>
				<Marker
					coordinate={{
						latitude: jobDetails.pickupLocation.coordinates[1],
						longitude: jobDetails.pickupLocation.coordinates[0],
					}}
					title="Pickup Location"
				>
					<FontAwesome5 name="map-pin" size={30} color="#34c759" />
				</Marker>
				{driverLocation && (
					<Marker coordinate={driverLocation} title="Your Driver">
						<FontAwesome5 name="truck" size={30} color={colors.tint} />
					</Marker>
				)}
			</MapView>

			<View
				style={[
					styles.statusContainer,
					{ backgroundColor: colors.card, borderTopColor: colors.border },
				]}
			>
				<Text style={[styles.statusText, { color: colors.text }]}>
					{jobDetails.Driver?.name || "Your driver"} is on the way!
				</Text>
				<View style={styles.driverInfoRow}>
					<Text style={[styles.subText, { color: colors.tabIconDefault }]}>
						Black Ford F-150
					</Text>
					<TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
						<FontAwesome5 name="phone-alt" size={16} color={colors.tint} />
						<Text style={[styles.callButtonText, { color: colors.tint }]}>
							Call Driver
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
};

// --- STYLES ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	statusContainer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		padding: 20,
		paddingBottom: 40, // Extra padding for home bar
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 10,
	},
	statusText: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
	subText: { fontSize: 16 },
	button: { padding: 15, borderRadius: 12, alignItems: "center" },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
	driverInfoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
	},
	callButton: { flexDirection: "row", alignItems: "center", padding: 8 },
	callButtonText: { fontWeight: "bold", marginLeft: 8, fontSize: 16 },
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

export default LiveTrackingScreen;
