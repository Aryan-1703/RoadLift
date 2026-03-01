import React, { useEffect, useState, useRef, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SafeAreaView,
	TextInput,
	ActivityIndicator,
	Platform,
	Keyboard,
	Alert,
	FlatList,
} from "react-native";
import MapView, {
	Marker,
	PROVIDER_GOOGLE,
	Region,
	MapPressEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useJob } from "../context/JobContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Location as AppLocation } from "../types";
import { api } from "../services/api";

interface PlaceSuggestion {
	place_id: string;
	description: string;
	structured_formatting: {
		main_text: string;
		secondary_text: string;
	};
}

export const LocationSelectionScreen = () => {
	const { setCustomerLocation, setJobStatus } = useJob();
	const { user } = useAuth();
	const { colors } = useTheme();
	const navigation = useNavigation<any>();
	const mapRef = useRef<MapView>(null);

	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<AppLocation | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [isLocating, setIsLocating] = useState(true);

	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted") {
					setHasPermission(false);
					setIsLocating(false);
					return;
				}
				setHasPermission(true);

				const location = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});

				const { latitude, longitude } = location.coords;
				await handleLocationSelect(latitude, longitude);

				mapRef.current?.animateToRegion(
					{
						latitude,
						longitude,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					},
					1000,
				);
			} catch (error) {
				console.error("Error getting location:", error);
				Alert.alert("Location Error", "Could not fetch your current location.");
			} finally {
				setIsLocating(false);
			}
		})();
	}, []);

	const handleLocationSelect = async (latitude: number, longitude: number) => {
		try {
			const response = await api.get<any>("/maps/reverse-geocode", {
				params: { lat: latitude, lng: longitude },
			});

			const results = response.data;
			let address = "Unknown Location";

			if (results && results.length > 0) {
				const place = results[0];
				// The backend proxy returns Google Geocoding API results
				// We can just use formatted_address or construct it
				address = place.formatted_address || "Unknown Location";
			}

			const loc: AppLocation = { latitude, longitude, address };
			setSelectedLocation(loc);
			setCustomerLocation(loc);
		} catch (error) {
			console.error("Reverse geocode error:", error);
			const loc: AppLocation = { latitude, longitude, address: "Selected Location" };
			setSelectedLocation(loc);
			setCustomerLocation(loc);
		}
	};

	const handleMapLongPress = (e: MapPressEvent) => {
		const { latitude, longitude } = e.nativeEvent.coordinate;
		handleLocationSelect(latitude, longitude);
	};

	const fetchSuggestions = async (text: string) => {
		if (!text.trim()) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		setIsSearching(true);
		try {
			const response = await api.get<any>("/maps/autocomplete", {
				params: { input: text },
			});
			const data = response.data;

			if (data.status === "OK") {
				setSuggestions(data.predictions);
				setShowSuggestions(true);
			} else if (data.status === "ZERO_RESULTS") {
				setSuggestions([]);
				setShowSuggestions(true);
			} else {
				console.error("Places API Error:", data.status, data.error_message);
			}
		} catch (error: any) {
			console.error("Network error fetching suggestions:", error);
			if (error.response?.status === 401) {
				Alert.alert("Session Expired", "Please log in again.");
			}
		} finally {
			setIsSearching(false);
		}
	};

	const handleSearchChange = (text: string) => {
		setSearchQuery(text);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		if (!text.trim()) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		debounceTimerRef.current = setTimeout(() => {
			fetchSuggestions(text);
		}, 300);
	};

	const handleSuggestionSelect = async (placeId: string, description: string) => {
		Keyboard.dismiss();
		setShowSuggestions(false);
		setSearchQuery(description);
		setIsLocating(true);

		try {
			const response = await api.get<any>("/maps/place-details", {
				params: { placeId },
			});
			const data = response.data;

			if (data.status === "OK" && data.result.geometry) {
				const { lat, lng } = data.result.geometry.location;
				const address = data.result.formatted_address || description;

				const loc: AppLocation = { latitude: lat, longitude: lng, address };
				setSelectedLocation(loc);
				setCustomerLocation(loc);

				mapRef.current?.animateToRegion(
					{
						latitude: lat,
						longitude: lng,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					},
					1000,
				);
			} else {
				Alert.alert("Error", "Could not get location details.");
			}
		} catch (error: any) {
			console.error("Error fetching place details:", error);
			if (error.response?.status === 401) {
				Alert.alert("Session Expired", "Please log in again.");
			} else {
				Alert.alert("Error", "Failed to fetch place details.");
			}
		} finally {
			setIsLocating(false);
		}
	};

	const handleRequestAssistance = () => {
		if (selectedLocation) {
			setJobStatus("selecting");
		}
	};

	if (hasPermission === false) {
		return (
			<View
				style={[
					styles.container,
					{
						backgroundColor: colors.background,
						justifyContent: "center",
						alignItems: "center",
						padding: 20,
					},
				]}
			>
				<Ionicons name="location-outline" size={64} color={colors.textMuted} />
				<Text
					style={[
						styles.title,
						{ color: colors.text, textAlign: "center", marginTop: 16 },
					]}
				>
					Location Permission Denied
				</Text>
				<Text
					style={[
						styles.subtitle,
						{ color: colors.textMuted, textAlign: "center", marginTop: 8 },
					]}
				>
					We need your location to provide roadside assistance. Please enable it in your
					device settings.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				showsUserLocation
				showsMyLocationButton={false}
				onLongPress={handleMapLongPress}
				initialRegion={{
					latitude: 37.78825,
					longitude: -122.4324,
					latitudeDelta: 0.0922,
					longitudeDelta: 0.0421,
				}}
				onPress={() => setShowSuggestions(false)}
			>
				{selectedLocation && (
					<Marker
						coordinate={{
							latitude: selectedLocation.latitude,
							longitude: selectedLocation.longitude,
						}}
						draggable
						onDragEnd={e => {
							const { latitude, longitude } = e.nativeEvent.coordinate;
							handleLocationSelect(latitude, longitude);
						}}
					/>
				)}
			</MapView>

			<SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
				<View style={styles.topBar} pointerEvents="box-none">
					<View style={styles.searchWrapper}>
						<View
							style={[
								styles.searchContainer,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
							<Ionicons
								name="search"
								size={20}
								color={colors.textMuted}
								style={styles.searchIcon}
							/>
							<TextInput
								style={[styles.searchInput, { color: colors.text }]}
								placeholder="Search address..."
								placeholderTextColor={colors.textMuted}
								value={searchQuery}
								onChangeText={handleSearchChange}
								onFocus={() => {
									if (searchQuery.trim().length > 0) {
										setShowSuggestions(true);
									}
								}}
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity
									onPress={() => {
										setSearchQuery("");
										setSuggestions([]);
										setShowSuggestions(false);
										Keyboard.dismiss();
									}}
									style={styles.clearIcon}
								>
									<Ionicons name="close-circle" size={20} color={colors.textMuted} />
								</TouchableOpacity>
							)}
							{isSearching && (
								<ActivityIndicator
									size="small"
									color={colors.primary}
									style={{ marginLeft: 8 }}
								/>
							)}
						</View>

						{showSuggestions && (
							<View
								style={[
									styles.suggestionsContainer,
									{ backgroundColor: colors.card, borderColor: colors.border },
								]}
							>
								{suggestions.length === 0 && !isSearching ? (
									<View style={styles.noResults}>
										<Text style={{ color: colors.textMuted }}>No results found</Text>
									</View>
								) : (
									<FlatList
										data={suggestions}
										keyExtractor={item => item.place_id}
										keyboardShouldPersistTaps="handled"
										renderItem={({ item }) => (
											<TouchableOpacity
												style={[
													styles.suggestionItem,
													{ borderBottomColor: colors.border },
												]}
												onPress={() =>
													handleSuggestionSelect(item.place_id, item.description)
												}
											>
												<View
													style={[
														styles.suggestionIcon,
														{ backgroundColor: colors.background },
													]}
												>
													<Ionicons
														name="location-outline"
														size={18}
														color={colors.textMuted}
													/>
												</View>
												<View style={styles.suggestionTextContainer}>
													<Text
														style={[styles.suggestionMainText, { color: colors.text }]}
														numberOfLines={1}
													>
														{item.structured_formatting.main_text}
													</Text>
													<Text
														style={[
															styles.suggestionSecondaryText,
															{ color: colors.textMuted },
														]}
														numberOfLines={1}
													>
														{item.structured_formatting.secondary_text}
													</Text>
												</View>
											</TouchableOpacity>
										)}
									/>
								)}
							</View>
						)}
					</View>

					<TouchableOpacity
						style={[
							styles.profileBtn,
							{ backgroundColor: colors.card, borderColor: colors.border },
						]}
						onPress={() => navigation.navigate("SettingsNav")}
					>
						<Text style={[styles.profileInitial, { color: colors.text }]}>
							{user?.name?.charAt(0) || "?"}
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>

			<View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
				<View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

				<Text style={[styles.title, { color: colors.text }]}>
					Need Roadside Assistance?
				</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Stranded? We're here to get you back on the road fast.
				</Text>

				<View
					style={[
						styles.locationCard,
						{ backgroundColor: colors.background, borderColor: colors.border },
					]}
				>
					<View style={[styles.locationIcon, { backgroundColor: colors.primary + "20" }]}>
						<Ionicons name="location" size={20} color={colors.primary} />
					</View>
					<View style={styles.locationTextContainer}>
						<Text style={[styles.locationLabel, { color: colors.textMuted }]}>
							Selected Location
						</Text>
						<Text style={[styles.locationText, { color: colors.text }]} numberOfLines={2}>
							{isLocating
								? "Locating..."
								: selectedLocation?.address || "Long press map to drop pin"}
						</Text>
					</View>
				</View>

				<PrimaryButton
					title="Get Help Now"
					onPress={handleRequestAssistance}
					disabled={!selectedLocation || isLocating}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1 },
	headerSafeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
	topBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 16,
		alignItems: "flex-start",
	},
	searchWrapper: {
		flex: 1,
		marginRight: 12,
		zIndex: 20,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 24,
		borderWidth: 1,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	searchIcon: { marginRight: 8 },
	clearIcon: { padding: 4 },
	searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
	suggestionsContainer: {
		marginTop: 8,
		borderRadius: 16,
		borderWidth: 1,
		maxHeight: 250,
		elevation: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		overflow: "hidden",
	},
	suggestionItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	suggestionIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	suggestionTextContainer: {
		flex: 1,
	},
	suggestionMainText: {
		fontSize: 15,
		fontWeight: "500",
		marginBottom: 2,
	},
	suggestionSecondaryText: {
		fontSize: 13,
	},
	noResults: {
		padding: 16,
		alignItems: "center",
	},
	profileBtn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	profileInitial: { fontSize: 18, fontWeight: "bold" },
	bottomSheet: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		paddingBottom: Platform.OS === "ios" ? 40 : 24,
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	dragHandle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		alignSelf: "center",
		marginBottom: 20,
	},
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
	subtitle: { fontSize: 14, marginBottom: 20 },
	locationCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 24,
	},
	locationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	locationTextContainer: { flex: 1 },
	locationLabel: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
	locationText: { fontSize: 14, fontWeight: "bold" },
});
