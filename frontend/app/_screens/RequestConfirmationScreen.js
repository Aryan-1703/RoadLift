import React, { useState, useRef, useEffect, useCallback } from "react";
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
	Keyboard,
	FlatList,
	Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import axios from "axios";
import { useStripe } from "@stripe/stripe-react-native";
import { debounce } from "lodash";
import { useTheme } from "../_context/ThemeContext";
import { useAuth } from "../_context/AuthContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import { API_URL } from "../config/constants";
import { FontAwesome5 } from "@expo/vector-icons";

const RequestConfirmationScreen = () => {
	// --- HOOKS & STATE (No changes here) ---
	const params = useLocalSearchParams();
	const router = useRouter();
	const { theme } = useTheme();
	const { token, user } = useAuth();
	const { initPaymentSheet, presentPaymentSheet } = useStripe();
	const mapRef = useRef(null);

	// --- YOUR EXISTING STATE (No changes needed) ---
	const [notes, setNotes] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const initialLocation = {
		latitude: parseFloat(params.userLat || "0"),
		longitude: parseFloat(params.userLon || "0"),
	};
	const [pickupLocation, setPickupLocation] = useState(initialLocation);
	const [isMapReady, setIsMapReady] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [predictions, setPredictions] = useState([]);
	const [isTyping, setIsTyping] = useState(false);

	// --- NEW STATE FOR VEHICLES ---
	const [vehicles, setVehicles] = useState([]);
	const [selectedVehicle, setSelectedVehicle] = useState(null);
	const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
	const [isVehicleLoading, setIsVehicleLoading] = useState(true);

	const isDarkMode = theme === "dark";
	const colors = Colors[theme];
	const serviceName = params.serviceName || "Service";
	const price = parseFloat(params.price || "0");

	// --- NEW EFFECT to Fetch Vehicles on Load ---
	useEffect(() => {
		const fetchUserVehicles = async () => {
			if (!token) return;
			try {
				const response = await axios.get(`${API_URL}/vehicles`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setVehicles(response.data);
				// Automatically select the default vehicle, or the first one as a fallback
				const defaultVehicle = response.data.find(v => v.id === user.defaultVehicleId);
				setSelectedVehicle(defaultVehicle || response.data[0]);
			} catch (error) {
				Alert.alert("Error", "Could not load your vehicle information.");
			} finally {
				setIsVehicleLoading(false);
			}
		};
		fetchUserVehicles();
	}, [token, user]);

	// --- SECURE GEOLOCATION & AUTOCOMPLETE LOGIC ---
	const getAddressFromCoords = useCallback(
		debounce(async ({ latitude, longitude }) => {
			if (!latitude || !longitude || !token) return;
			try {
				const response = await axios.get(`${API_URL}/geocode/reverse`, {
					headers: { Authorization: `Bearer ${token}` },
					params: { lat: latitude, lon: longitude },
				});
				if (response.data?.address) {
					// Update our searchQuery state to match the map's pin
					setSearchQuery(response.data.address);
				}
			} catch (error) {
				console.error("Reverse geocode failed:", error);
				setSearchQuery("Address unavailable");
			}
		}, 500),
		[token]
	);

	const fetchPredictions = useCallback(
		debounce(async text => {
			if (text.length < 3) {
				setPredictions([]);
				return;
			}
			try {
				const response = await axios.get(`${API_URL}/geocode/autocomplete`, {
					headers: { Authorization: `Bearer ${token}` },
					params: { query: text },
				});
				if (Array.isArray(response.data)) {
					setPredictions(response.data);
				}
			} catch (error) {
				console.error("Autocomplete fetch error:", error);
				setPredictions([]);
			}
		}, 400),
		[token]
	);

	useEffect(() => {
		getAddressFromCoords(initialLocation);
	}, []);

	useEffect(() => {
		if (isTyping) {
			fetchPredictions(searchQuery);
		}
	}, [searchQuery, isTyping, fetchPredictions]);

	// --- MAP & SEARCH HANDLERS ---
	const handlePlaceSelected = async placeId => {
		setIsTyping(false);
		setPredictions([]);
		Keyboard.dismiss();
		try {
			const response = await axios.get(`${API_URL}/geocode/place-details`, {
				headers: { Authorization: `Bearer ${token}` },
				params: { placeId },
			});
			const { lat, lng } = response.data.geometry.location;
			mapRef.current?.animateToRegion({
				latitude: lat,
				longitude: lng,
				latitudeDelta: 0.005,
				longitudeDelta: 0.005,
			});
		} catch (error) {
			Alert.alert("Error", "Could not get location details.");
		}
	};

	const onRegionChangeComplete = region => {
		if (isMapReady && !isTyping) {
			const newCoords = { latitude: region.latitude, longitude: region.longitude };
			setPickupLocation(newCoords);
			getAddressFromCoords(newCoords);
		}
	};

	const recenterMap = () => {
		mapRef.current?.animateToRegion(
			{ ...initialLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 },
			500
		);
	};

	// --- Stripe + Job creation handler ---
	const handleConfirmRequest = async () => {
		// --- ADDED VALIDATION ---
		if (!selectedVehicle) {
			Alert.alert("Vehicle Required", "Please add or select a vehicle to proceed.");
			return;
		}

		setIsLoading(true);
		if (!token) {
			Alert.alert("Authentication Error", "Please log in.");
			setIsLoading(false);
			return;
		}

		try {
			// A single jobData object for both payment paths
			const jobDataPayload = {
				serviceType: params.serviceType,
				pickupLatitude: pickupLocation.latitude,
				pickupLongitude: pickupLocation.longitude,
				estimatedCost: price,
				notes: notes,
				vehicleId: selectedVehicle.id,
			};

			if (user && user.defaultPaymentMethodId) {
				console.log(
					`Using saved card: ${user.defaultPaymentMethodId}. Creating job directly.`
				);

				// --- SAVED CARD FLOW ---
				const jobResponse = await axios.post(`${API_URL}/jobs`, jobDataPayload, {
					headers: { Authorization: `Bearer ${token}` },
				});

				router.replace({
					pathname: "/finding-driver",
					params: { jobId: jobResponse.data.job.id },
				});
			} else {
				// --- NEW CARD / APPLE PAY FLOW ---
				const piResponse = await axios.post(
					`${API_URL}/payments/create-payment-intent`,
					{ estimatedCost: price },
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				const { clientSecret, paymentIntentId, customer } = piResponse.data;
				const { error: initError } = await initPaymentSheet({
					merchantDisplayName: "RoadLift, Inc.",
					paymentIntentClientSecret: clientSecret,
					customerId: customer,
					allowsDelayedPaymentMethods: true,
					setupFutureUsage: "OffSession",
				});
				if (initError) throw new Error(initError.message);
				const { error: presentError } = await presentPaymentSheet();
				if (presentError) {
					if (presentError.code === "Canceled") {
						setIsLoading(false);
						return;
					}
					throw new Error(presentError.message);
				}
				// Now add the paymentIntentId to our payload and create the job
				const jobResponse = await axios.post(
					`${API_URL}/jobs`,
					{
						...jobDataPayload,
						paymentIntentId: paymentIntentId,
					},
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);
				router.replace({
					pathname: "/finding-driver",
					params: { jobId: jobResponse.data.job.id },
				});
			}
		} catch (error) {
			console.error("Request flow error:", error.response?.data || error.message);
			Alert.alert(
				"Request Failed",
				"Could not complete your request. Please check your payment method."
			);
		} finally {
			setIsLoading(false);
		}
	};
	// --- RENDER ---
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
						ref={mapRef}
						style={styles.map}
						provider={PROVIDER_GOOGLE}
						initialRegion={{
							...initialLocation,
							latitudeDelta: 0.005,
							longitudeDelta: 0.005,
						}}
						onMapReady={() => setIsMapReady(true)}
						onRegionChangeComplete={onRegionChangeComplete}
						onPanDrag={() => {
							setIsTyping(false);
							Keyboard.dismiss();
						}}
					/>
					<View style={autocompleteStyles(colors).container}>
						<TextInput
							style={autocompleteStyles(colors).textInput}
							placeholder="Search or move the map"
							placeholderTextColor={colors.tabIconDefault}
							value={searchQuery}
							onChangeText={text => {
								setSearchQuery(text);
								setIsTyping(true); // User is typing, fetch predictions
							}}
							onFocus={() => setIsTyping(true)}
						/>
						{isTyping && predictions.length > 0 && (
							<View style={autocompleteStyles(colors).listView}>
								<FlatList
									data={predictions}
									keyExtractor={item => item.place_id}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={autocompleteStyles(colors).row}
											onPress={() => handlePlaceSelected(item.place_id)}
										>
											<Text style={autocompleteStyles(colors).description}>
												{item.description}
											</Text>
										</TouchableOpacity>
									)}
									ItemSeparatorComponent={() => (
										<View style={autocompleteStyles(colors).separator} />
									)}
									keyboardShouldPersistTaps="handled" // Critical for FlatList inside a scrollable view
								/>
							</View>
						)}
					</View>

					<View style={styles.pinContainer}>
						<FontAwesome5 name="map-marker-alt" size={40} color={colors.danger} />
					</View>
					<TouchableOpacity style={styles.recenterButtonContainer} onPress={recenterMap}>
						<FontAwesome5 name="crosshairs" size={24} color={colors.tint} />
					</TouchableOpacity>
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
					<Text style={[styles.sectionHeader, { color: colors.text }]}>
						Vehicle for Service
					</Text>
					<TouchableOpacity
						style={[
							styles.selectorBox,
							{ backgroundColor: colors.background, borderColor: colors.border },
						]}
						// This onPress is now on the main box, making the whole thing tappable
						onPress={() => {
							if (vehicles.length === 0) {
								router.push("/add-vehicle");
							} else {
								setVehicleModalVisible(true);
							}
						}}
					>
						{isVehicleLoading ? (
							<ActivityIndicator color={colors.tint} />
						) : selectedVehicle ? (
							<View style={styles.selectorContent}>
								<Text style={[styles.selectorTitle, { color: colors.text }]}>
									{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
								</Text>
								<Text style={[styles.selectorSubtitle, { color: colors.tabIconDefault }]}>
									{selectedVehicle.licensePlate || "Tap to switch"}
								</Text>
							</View>
						) : (
							<Text style={[styles.selectorTitle, { color: colors.tint }]}>
								+ Add a Vehicle for This Job
							</Text>
						)}
						{/* The chevron now correctly indicates you can tap to see more */}
						{vehicles.length > 1 && (
							<FontAwesome5 name="chevron-down" size={16} color={colors.tabIconDefault} />
						)}
					</TouchableOpacity>

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
							<Text style={styles.buttonText}>Pay & Request Help</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
			<Modal transparent={true} visible={vehicleModalVisible} animationType="fade">
				<TouchableOpacity
					style={styles.modalBackdrop}
					onPress={() => setVehicleModalVisible(false)}
				>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>
							Select a Vehicle
						</Text>
						<FlatList
							data={vehicles}
							keyExtractor={item => item.id.toString()}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.modalItem}
									onPress={() => {
										setSelectedVehicle(item);
										setVehicleModalVisible(false);
									}}
								>
									<Text style={{ color: colors.text, fontSize: 16 }}>
										{item.year} {item.make} {item.model}
									</Text>
								</TouchableOpacity>
							)}
							ItemSeparatorComponent={() => (
								<View style={{ height: 1, backgroundColor: colors.border }} />
							)}
						/>
						<TouchableOpacity
							onPress={() => setVehicleModalVisible(false)}
							style={styles.modalCloseButton}
						>
							<Text style={{ color: colors.danger, fontWeight: "600" }}>Close</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</SafeAreaView>
	);
};
const styles = StyleSheet.create({
	container: { flex: 1 },
	mapContainer: { flex: 1 },
	map: { ...StyleSheet.absoluteFillObject },
	pinContainer: {
		position: "absolute",
		left: "50%",
		top: "50%",
		marginLeft: -12,
		marginTop: -40,
		zIndex: 0,
	},
	recenterButtonContainer: {
		position: "absolute",
		bottom: 20,
		right: 20,
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
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
	sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10, marginTop: 15 },
	selectorBox: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 15,
	},
	selectorContent: { flex: 1 },
	selectorTitle: { fontSize: 16, fontWeight: "600" },
	selectorSubtitle: { fontSize: 14, marginTop: 4 },
	// Modal Styles
	modalBackdrop: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	modalContent: { width: "85%", borderRadius: 12, overflow: "hidden" },
	modalTitle: { fontSize: 20, fontWeight: "bold", padding: 20, textAlign: "center" },
	modalItem: { padding: 20 },
	modalCloseButton: {
		padding: 20,
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
});

const autocompleteStyles = colors => ({
	container: { position: "absolute", top: 15, left: 15, right: 15, zIndex: 1 },
	textInput: {
		height: 50,
		borderRadius: 10,
		paddingLeft: 15,
		backgroundColor: colors.card,
		color: colors.text,
		fontSize: 16,
		borderWidth: 1,
		borderColor: colors.border,
	},
	listView: {
		borderRadius: 8,
		backgroundColor: colors.card,
		marginTop: 4,
		borderWidth: 1,
		borderColor: colors.border,
	},
	row: { padding: 13 },
	separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
	description: { color: colors.text, fontSize: 16 },
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
