import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	Alert,
	StatusBar,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import axios from "axios";
import { API_URL } from "../config/constants";
import { useAuth } from "../_context/AuthContext";
import { useSocket } from "../_context/SocketContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";

const LiveTrackingScreen = () => {
	const { jobId, driverId } = useLocalSearchParams();
	const { token } = useAuth();
	const { socket } = useSocket();
	const { theme } = useTheme();

	const [driverLocation, setDriverLocation] = useState(null);
	const [jobDetails, setJobDetails] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const mapRef = useRef(null);

	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// Effect to fetch initial job details
	useEffect(() => {
		const fetchJob = async () => {
			if (!jobId) return;
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

	// Effect to listen for live location updates
	useEffect(() => {
		if (!socket || !jobId) return;

		const handleLocationUpdate = data => {
			// Check if the update is for the current job
			if (String(data.jobId) === String(jobId)) {
				console.log("Customer received driver location update:", data.location);
				setDriverLocation(data.location);
				// Animate map to new location
				mapRef.current?.animateToRegion(
					{
						...data.location,
						latitudeDelta: 0.02,
						longitudeDelta: 0.02,
					},
					1000
				); // Animate over 1 second
			}
		};

		socket.on("driver-location-updated", handleLocationUpdate);

		return () => {
			socket.off("driver-location-updated", handleLocationUpdate);
		};
	}, [socket, jobId]);

	if (isLoading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text>Loading job details...</Text>
			</SafeAreaView>
		);
	}

	if (!jobDetails || !jobDetails.pickupLocation) {
		return (
			<SafeAreaView style={styles.center}>
				<Text>Failed to load job information.</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<MapView
				ref={mapRef}
				style={styles.map}
				// provider={PROVIDER_GOOGLE}
				initialRegion={{
					latitude: jobDetails.pickupLocation.coordinates[1],
					longitude: jobDetails.pickupLocation.coordinates[0],
					latitudeDelta: 0.05,
					longitudeDelta: 0.05,
				}}
			>
				{/* Customer Pickup Location */}
				<Marker
					coordinate={{
						latitude: jobDetails.pickupLocation.coordinates[1],
						longitude: jobDetails.pickupLocation.coordinates[0],
					}}
					title="Pickup Location"
					pinColor="green"
				/>
				{/* Driver's Live Location */}
				{driverLocation && (
					<Marker
						coordinate={driverLocation}
						title="Your Driver"
						pinColor={colors.tint}
					/>
				)}
			</MapView>
			<View
				style={[
					styles.statusContainer,
					{ backgroundColor: colors.card, borderTopColor: colors.border },
				]}
			>
				<Text style={[styles.statusText, { color: colors.text }]}>
					Your driver is on the way!
				</Text>
			</View>
		</SafeAreaView>
	);
};
const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	statusContainer: {
		padding: 20,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderColor: "#ddd",
	},
	statusText: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 8,
	},
});

export default LiveTrackingScreen;
