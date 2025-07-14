import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TextInput,
	Alert,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import { API_URL } from "../config/constants";

const RequestConfirmationScreen = () => {
	// --- HOOKS & STATE ---
	const params = useLocalSearchParams();
	const router = useRouter();
	const { theme } = useTheme();
	const [notes, setNotes] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// --- THEME & COLOR SETUP ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- PARSE PARAMS (with safety checks) ---
	const serviceName = params.serviceName || "Service";
	const price = parseFloat(params.price || "0");
	const userLat = parseFloat(params.userLat || "0");
	const userLon = parseFloat(params.userLon || "0");

	// --- API CALL HANDLER ---
	const handleConfirmRequest = async () => {
		setIsLoading(true);
		try {
			// 1. Get auth token
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				Alert.alert(
					"Authentication Error",
					"You are not logged in. Please log in again."
				);
				router.replace("/login");
				return;
			}

			// 2. Prepare data payload
			const jobData = {
				serviceType: params.serviceType,
				pickupLatitude: parseFloat(params.userLat),
				pickupLongitude: parseFloat(params.userLon),
				estimatedCost: parseFloat(params.price),
				notes: notes,
			};

			// 3. Make authenticated API call
			const response = await axios.post(`${API_URL}/jobs`, jobData, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			console.log("Job created successfully:", response.data.job);

			// 4. Navigate to the next screen on success
			router.replace({
				pathname: "/finding-driver",
				params: { jobId: response.data.job.id },
			});
		} catch (error) {
			console.error("Job creation error:", error.response?.data || error.message);
			Alert.alert(
				"Request Failed",
				"Could not create your service request. Please try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Confirm Your Request" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				{/* Check if location is valid before rendering map */}
				{userLat !== 0 && userLon !== 0 ? (
					<MapView
						style={styles.map}
						initialRegion={{
							latitude: userLat,
							longitude: userLon,
							latitudeDelta: 0.01,
							longitudeDelta: 0.01,
						}}
						provider="google"
						customMapStyle={isDarkMode ? mapStyleDark : []}
					>
						<Marker
							coordinate={{ latitude: userLat, longitude: userLon }}
							title="Your Location"
						/>
					</MapView>
				) : (
					<View style={styles.map}>
						<ActivityIndicator />
						<Text style={{ marginTop: 10, color: colors.text }}>Getting location...</Text>
					</View>
				)}

				<View
					style={[
						styles.detailsContainer,
						{ backgroundColor: colors.card, borderTopColor: colors.border },
					]}
				>
					<View style={styles.serviceRow}>
						<Text style={[styles.serviceName, { color: colors.text }]}>
							{serviceName}
						</Text>
						<Text style={[styles.servicePrice, { color: colors.text }]}>
							${price.toFixed(2)}
						</Text>
					</View>
					<TextInput
						style={[
							styles.notesInput,
							{
								backgroundColor: colors.background,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Add notes for the driver (optional)..."
						placeholderTextColor={colors.tabIconDefault}
						value={notes}
						onChangeText={setNotes}
						multiline
					/>
					<TouchableOpacity
						style={[styles.confirmButton, { backgroundColor: colors.tint }]}
						onPress={handleConfirmRequest}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#ffffff" />
						) : (
							<Text style={styles.buttonText}>Request Help Now</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 15,
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "bold",
	},
	map: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	detailsContainer: {
		padding: 20,
		paddingBottom: 30, // Extra space at the bottom
		borderTopWidth: 1,
	},
	serviceRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	serviceName: {
		fontSize: 20,
		fontWeight: "600",
	},
	servicePrice: {
		fontSize: 20,
		fontWeight: "bold",
	},
	notesInput: {
		height: 80,
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		textAlignVertical: "top",
		marginBottom: 15,
		fontSize: 16,
	},
	confirmButton: {
		padding: 15,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
	},
});

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

export default RequestConfirmationScreen;
