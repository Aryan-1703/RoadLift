import React, { useState, useRef, useEffect } from "react";
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
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { useStripe } from "@stripe/stripe-react-native";
import { useTheme } from "../_context/ThemeContext";
import { useAuth } from "../_context/AuthContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import { API_URL } from "../config/constants";
import { FontAwesome5 } from "@expo/vector-icons";

const RequestConfirmationScreen = () => {
	// --- HOOKS & STATE ---
	const params = useLocalSearchParams();
	const router = useRouter();
	const { theme } = useTheme();
	const { token, user } = useAuth();
	const { initPaymentSheet, presentPaymentSheet } = useStripe(); // Stripe hook

	const [notes, setNotes] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const initialLocation = {
		latitude: parseFloat(params.userLat || "0"),
		longitude: parseFloat(params.userLon || "0"),
	};

	const [pickupLocation, setPickupLocation] = useState(initialLocation);
	const [selectedAddress, setSelectedAddress] = useState("Loading address...");

	const [isMapReady, setIsMapReady] = useState(false);
	const mapRef = useRef(null);

	const isDarkMode = theme === "dark";
	const colors = Colors[theme];
	const serviceName = params.serviceName || "Service";
	const price = parseFloat(params.price || "0");

	// --- EFFECT FOR REVERSE GEOCODING ---
	useEffect(() => {
		const getAddressFromCoords = async coords => {
			// Prevent geocoding if coords are not valid
			if (!coords || coords.latitude === 0) {
				setSelectedAddress("Cannot determine address.");
				return;
			}
			try {
				const geocodeResult = await Location.reverseGeocodeAsync(coords);
				if (geocodeResult && geocodeResult.length > 0) {
					const addr = geocodeResult[0];
					const formattedAddress = `${addr.streetNumber || ""} ${addr.street || ""}, ${
						addr.city || ""
					}`.trim();
					setSelectedAddress(formattedAddress || "Address details unavailable");
				} else {
					setSelectedAddress("Could not find address");
				}
			} catch (error) {
				console.error("Reverse geocoding failed:", error);
				setSelectedAddress("Address unavailable");
			}
		};

		// Get address whenever the pickupLocation changes
		getAddressFromCoords(pickupLocation);
	}, [pickupLocation]);

	// --- THE NEW AND UPDATED PAYMENT + JOB CREATION HANDLER ---
	const handleConfirmRequest = async () => {
		setIsLoading(true);
		if (!token) {
			Alert.alert("Authentication Error", "You are not logged in.");
			setIsLoading(false);
			return;
		}

		try {
			// Step 1: Create a Payment Intent on your backend.
			const piResponse = await axios.post(
				`${API_URL}/payments/create-payment-intent`,
				{ estimatedCost: price },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const { clientSecret, paymentIntentId, customer } = piResponse.data;

			// Step 2: Initialize Stripe's bottom sheet.
			const { error: initError } = await initPaymentSheet({
				merchantDisplayName: "RoadLift, Inc.",
				paymentIntentClientSecret: clientSecret,
				customerId: customer,
				allowsDelayedPaymentMethods: true,
				setupFutureUsage: "OffSession",
			});
			if (initError) {
				throw new Error(`Could not initialize payment sheet: ${initError.message}`);
			}

			// Step 3: Present the bottom sheet.
			// ** THIS IS WHERE APPLE PAY / GOOGLE PAY WILL APPEAR AUTOMATICALLY **
			const { error: presentError } = await presentPaymentSheet();
			if (presentError) {
				if (presentError.code === "Canceled") return;
				throw new Error(`Payment failed: ${presentError.message}`);
			}

			// Step 4: If payment was successful, create the job in your database.
			const jobData = {
				serviceType: params.serviceType,
				pickupLatitude: pickupLocation.latitude,
				pickupLongitude: pickupLocation.longitude,
				estimatedCost: price,
				notes: notes,
				paymentIntentId: paymentIntentId,
			};
			const jobResponse = await axios.post(`${API_URL}/jobs`, jobData, {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Step 5: Navigate to the next screen.
			router.replace({
				pathname: "/finding-driver",
				params: { jobId: jobResponse.data.job.id },
			});
		} catch (error) {
			console.error("Request flow error:", error.response?.data || error.message);
			Alert.alert("Request Failed", "Could not complete your request. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const onRegionChangeComplete = async region => {
		setPickupLocation({
			latitude: region.latitude,
			longitude: region.longitude,
		});

		try {
			const geocode = await Location.reverseGeocodeAsync({
				latitude: region.latitude,
				longitude: region.longitude,
			});
			if (geocode.length > 0) {
				const addr = geocode[0];
				const readable = `${addr.name || ""} ${addr.street || ""}, ${addr.city || ""}, ${
					addr.region || ""
				}`;
				setSelectedAddress(readable.trim());
			} else {
				setSelectedAddress("Unknown location");
			}
		} catch (error) {
			console.error("Reverse geocoding failed:", error);
			setSelectedAddress("Address unavailable");
		}
	};
	const recenterMap = () => {
		mapRef.current?.animateToRegion(
			{
				...initialLocation,
				latitudeDelta: 0.005,
				longitudeDelta: 0.005,
			},
			500
		);
	};

	// --- RENDER ---
	// The render block JSX is still perfectly fine and does not need changes.
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Confirm Pickup Location" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<View style={styles.mapContainer}>
					<MapView
						style={styles.map}
						initialRegion={{
							...initialLocation,
							latitudeDelta: 0.005,
							longitudeDelta: 0.005,
						}}
						onRegionChangeComplete={onRegionChangeComplete}
						onMapReady={() => setIsMapReady(true)}
					/>

					<View style={styles.pinContainer}>
						<FontAwesome5 name="map-marker-alt" size={40} color={colors.danger} />
					</View>

					<View style={[styles.locationBar, { backgroundColor: colors.card }]}>
						<FontAwesome5
							name="map-pin"
							size={20}
							color={colors.text}
							style={{ marginRight: 10 }}
						/>
						<Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
							{selectedAddress}
						</Text>
						<TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
							<FontAwesome5 name="crosshairs" size={20} color={colors.tint} />
						</TouchableOpacity>
					</View>
				</View>

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
						onPress={handleConfirmRequest} // It now calls the new handler
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#ffffff" />
						) : (
							<Text style={styles.buttonText}>Pay & Request Help</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}; // --- STYLESHEET ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	mapContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	map: { ...StyleSheet.absoluteFillObject },
	pinContainer: {
		position: "absolute",
		left: "50%",
		top: "50%",
		marginLeft: -12,
		marginTop: -40,
	},
	locationBar: {
		position: "absolute",
		top: 15,
		left: 15,
		right: 15,
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 5,
	},
	addressText: { flex: 1, fontSize: 16, fontWeight: "600", marginRight: 10 },
	recenterButton: { padding: 5 },
	detailsContainer: { padding: 20, paddingBottom: 30, borderTopWidth: 1 },
	serviceRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	serviceName: { fontSize: 20, fontWeight: "600" },
	servicePrice: { fontSize: 20, fontWeight: "bold" },
	notesInput: {
		height: 80,
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		textAlignVertical: "top",
		marginBottom: 15,
		fontSize: 16,
	},
	confirmButton: { padding: 15, borderRadius: 10, alignItems: "center" },
	buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
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

export default RequestConfirmationScreen;
