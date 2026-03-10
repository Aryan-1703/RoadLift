import React, { useEffect, useState, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Platform,
	Keyboard,
	Alert,
	FlatList,
	Animated,
	PanResponder,
	Dimensions,
	StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useJob } from "../context/JobContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Location as AppLocation } from "../types";
import { api } from "../services/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ✅ Fix 2: Sheet has a FIXED height. We animate translateY instead of height.
//   translateY = 0           → fully expanded
//   translateY = SNAP_OFFSET → collapsed (only SHEET_PEEK_HEIGHT is visible above the bottom)
const SHEET_FULL_HEIGHT = SCREEN_HEIGHT * 0.72;
const SHEET_PEEK_HEIGHT = SCREEN_HEIGHT * 0.38;
const SNAP_OFFSET = SHEET_FULL_HEIGHT - SHEET_PEEK_HEIGHT;
const DRAG_THRESHOLD = 50;

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
	const insets = useSafeAreaInsets(); // ✅ replaces SafeAreaView

	// ── Animated values ──────────────────────────────────────────────────────────
	// ✅ Fix 3: translateY supports useNativeDriver: true on all three animation types
	const sheetTranslateY = useRef(new Animated.Value(SNAP_OFFSET)).current; // start collapsed
	const lastTranslateY = useRef(SNAP_OFFSET);
	const isExpanded = useRef(false);

	// Separate node for drag handle pulse — useNativeDriver: true ✅
	const dragIndicator = useRef(new Animated.Value(1)).current;

	// Pin pulse — transform + opacity → useNativeDriver: true ✅
	const pulseScale = useRef(new Animated.Value(1)).current;
	const pulseOpacity = useRef(new Animated.Value(0.5)).current;

	// ── State ────────────────────────────────────────────────────────────────────
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<AppLocation | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [isLocating, setIsLocating] = useState(true);
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// ── Pin pulse loop ───────────────────────────────────────────────────────────
	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.parallel([
					Animated.timing(pulseScale, {
						toValue: 1.9,
						duration: 1100,
						useNativeDriver: true,
					}),
					Animated.timing(pulseOpacity, {
						toValue: 0,
						duration: 1100,
						useNativeDriver: true,
					}),
				]),
				Animated.parallel([
					Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
					Animated.timing(pulseOpacity, {
						toValue: 0.5,
						duration: 0,
						useNativeDriver: true,
					}),
				]),
			]),
		).start();
	}, []);

	// ── Location permission + initial GPS ────────────────────────────────────────
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
				const loc = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});
				const { latitude, longitude } = loc.coords;
				await handleLocationSelect(latitude, longitude);
				mapRef.current?.animateToRegion(
					{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
					1000,
				);
			} catch (err) {
				console.error("Location error:", err);
				Alert.alert("Location Error", "Could not fetch your current location.");
			} finally {
				setIsLocating(false);
			}
		})();
	}, []);

	// ── Sheet snap helpers ───────────────────────────────────────────────────────
	const snapSheet = (toExpanded: boolean) => {
		const target = toExpanded ? 0 : SNAP_OFFSET;
		isExpanded.current = toExpanded;
		lastTranslateY.current = target;
		// ✅ useNativeDriver: true — translateY is fully native-driver supported
		Animated.spring(sheetTranslateY, {
			toValue: target,
			useNativeDriver: true,
			tension: 65,
			friction: 11,
		}).start();
	};

	const snapToExpanded = () => snapSheet(true);
	const snapToCollapsed = () => {
		snapSheet(false);
		Keyboard.dismiss();
		setShowSuggestions(false);
	};

	// ── PanResponder ─────────────────────────────────────────────────────────────
	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,

			onPanResponderGrant: () => {
				sheetTranslateY.stopAnimation();
				// dragIndicator is its own isolated node → useNativeDriver: true ✅
				Animated.sequence([
					Animated.timing(dragIndicator, {
						toValue: 1.4,
						duration: 100,
						useNativeDriver: true,
					}),
					Animated.timing(dragIndicator, {
						toValue: 1,
						duration: 100,
						useNativeDriver: true,
					}),
				]).start();
			},

			onPanResponderMove: (_, g) => {
				// dy > 0 = dragging down = higher translateY (more hidden)
				const next = lastTranslateY.current + g.dy;
				const clamped = Math.max(0, Math.min(SNAP_OFFSET, next));
				sheetTranslateY.setValue(clamped); // setValue is driver-agnostic ✅
			},

			onPanResponderRelease: (_, g) => {
				const draggedUp = g.dy < -DRAG_THRESHOLD;
				const draggedDown = g.dy > DRAG_THRESHOLD;
				let expand: boolean;
				if (draggedUp && !isExpanded.current) expand = true;
				else if (draggedDown && isExpanded.current) expand = false;
				else expand = isExpanded.current;
				snapSheet(expand);
			},
		}),
	).current;

	// ── Location helpers ─────────────────────────────────────────────────────────
	const handleLocationSelect = async (latitude: number, longitude: number) => {
		try {
			const resp = await api.get<any>("/maps/reverse-geocode", {
				params: { lat: latitude, lng: longitude },
			});
			const address = resp.data?.[0]?.formatted_address ?? "Unknown Location";
			const loc: AppLocation = { latitude, longitude, address };
			setSelectedLocation(loc);
			setCustomerLocation(loc);
		} catch {
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
			const resp = await api.get<any>("/maps/autocomplete", { params: { input: text } });
			const data = resp.data;
			if (data.status === "OK") {
				setSuggestions(data.predictions);
				setShowSuggestions(true);
			} else {
				setSuggestions([]);
				setShowSuggestions(data.status === "ZERO_RESULTS");
			}
		} catch (err: any) {
			if (err.response?.status === 401)
				Alert.alert("Session Expired", "Please log in again.");
		} finally {
			setIsSearching(false);
		}
	};

	const handleSearchChange = (text: string) => {
		setSearchQuery(text);
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		if (!text.trim()) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}
		debounceTimerRef.current = setTimeout(() => fetchSuggestions(text), 300);
	};

	const handleSuggestionSelect = async (placeId: string, description: string) => {
		Keyboard.dismiss();
		setShowSuggestions(false);
		setSearchQuery(description);
		setIsLocating(true);
		try {
			const resp = await api.get<any>("/maps/place-details", { params: { placeId } });
			const data = resp.data;
			if (data.status === "OK" && data.result.geometry) {
				const { lat, lng } = data.result.geometry.location;
				const address = data.result.formatted_address || description;
				const loc: AppLocation = { latitude: lat, longitude: lng, address };
				setSelectedLocation(loc);
				setCustomerLocation(loc);
				mapRef.current?.animateToRegion(
					{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
					1000,
				);
			} else {
				Alert.alert("Error", "Could not get location details.");
			}
		} catch (err: any) {
			if (err.response?.status === 401)
				Alert.alert("Session Expired", "Please log in again.");
			else Alert.alert("Error", "Failed to fetch place details.");
		} finally {
			setIsLocating(false);
		}
	};

	const handleRecenter = async () => {
		setIsLocating(true);
		try {
			const loc = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});
			const { latitude, longitude } = loc.coords;
			await handleLocationSelect(latitude, longitude);
			mapRef.current?.animateToRegion(
				{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
				800,
			);
		} finally {
			setIsLocating(false);
		}
	};

	// ── Permission denied ────────────────────────────────────────────────────────
	if (hasPermission === false) {
		return (
			<View
				style={[
					styles.permissionScreen,
					{ backgroundColor: colors.background, paddingTop: insets.top },
				]}
			>
				<StatusBar barStyle="light-content" />
				<View style={[styles.permissionIcon, { backgroundColor: colors.primary + "15" }]}>
					<Ionicons name="location-outline" size={48} color={colors.primary} />
				</View>
				<Text style={[styles.permissionTitle, { color: colors.text }]}>
					Location Access Needed
				</Text>
				<Text style={[styles.permissionBody, { color: colors.textMuted }]}>
					RoadLift needs your location to dispatch the nearest available driver. Please
					enable location access in your device settings.
				</Text>
			</View>
		);
	}

	// ── Main screen ──────────────────────────────────────────────────────────────
	return (
		<View style={styles.root}>
			<StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

			{/* Map */}
			<MapView
				ref={mapRef}
				style={StyleSheet.absoluteFill}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				showsUserLocation
				showsMyLocationButton={false}
				onLongPress={handleMapLongPress}
				onPress={() => {
					setShowSuggestions(false);
					snapToCollapsed();
				}}
				customMapStyle={darkMapStyle}
				initialRegion={{
					latitude: 43.7,
					longitude: -79.42,
					latitudeDelta: 0.0922,
					longitudeDelta: 0.0421,
				}}
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
					>
						<View style={styles.customPin}>
							{/* ✅ useNativeDriver: true — transform + opacity only */}
							<Animated.View
								style={[
									styles.pinPulse,
									{ opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
								]}
							/>
							<View style={[styles.pinDot, { backgroundColor: colors.primary }]}>
								<Ionicons name="car" size={14} color="#fff" />
							</View>
						</View>
					</Marker>
				)}
			</MapView>

			{/* Top search bar — insets replace SafeAreaView */}
			<View
				style={[
					styles.topOverlay,
					{ paddingTop: insets.top + (Platform.OS === "android" ? 8 : 4) },
				]}
				pointerEvents="box-none"
			>
				<View style={styles.topBar} pointerEvents="box-none">
					<View style={styles.searchWrapper}>
						<View
							style={[
								styles.searchBox,
								{ backgroundColor: colors.card + "F5", borderColor: colors.border },
							]}
						>
							{isSearching ? (
								<ActivityIndicator
									size="small"
									color={colors.primary}
									style={styles.searchIcon}
								/>
							) : (
								<Ionicons
									name="search"
									size={18}
									color={colors.textMuted}
									style={styles.searchIcon}
								/>
							)}
							<TextInput
								style={[styles.searchInput, { color: colors.text }]}
								placeholder="Search address or landmark..."
								placeholderTextColor={colors.textMuted}
								value={searchQuery}
								onChangeText={handleSearchChange}
								onFocus={() => {
									snapToExpanded();
									if (searchQuery.trim()) setShowSuggestions(true);
								}}
								returnKeyType="search"
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity
									onPress={() => {
										setSearchQuery("");
										setSuggestions([]);
										setShowSuggestions(false);
									}}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="close-circle" size={18} color={colors.textMuted} />
								</TouchableOpacity>
							)}
						</View>

						{showSuggestions && (
							<View
								style={[
									styles.suggestions,
									{ backgroundColor: colors.card, borderColor: colors.border },
								]}
							>
								{suggestions.length === 0 && !isSearching ? (
									<View style={styles.noResults}>
										<Ionicons name="search-outline" size={24} color={colors.textMuted} />
										<Text style={[styles.noResultsText, { color: colors.textMuted }]}>
											No results found
										</Text>
									</View>
								) : (
									<FlatList
										data={suggestions}
										keyExtractor={item => item.place_id}
										keyboardShouldPersistTaps="handled"
										showsVerticalScrollIndicator={false}
										renderItem={({ item, index }) => (
											<TouchableOpacity
												style={[
													styles.suggestionRow,
													{ borderBottomColor: colors.border },
													index === suggestions.length - 1 && { borderBottomWidth: 0 },
												]}
												onPress={() =>
													handleSuggestionSelect(item.place_id, item.description)
												}
												activeOpacity={0.7}
											>
												<View
													style={[
														styles.suggIconWrap,
														{ backgroundColor: colors.primary + "15" },
													]}
												>
													<Ionicons
														name="location-outline"
														size={16}
														color={colors.primary}
													/>
												</View>
												<View style={{ flex: 1 }}>
													<Text
														style={[styles.suggMain, { color: colors.text }]}
														numberOfLines={1}
													>
														{item.structured_formatting.main_text}
													</Text>
													<Text
														style={[styles.suggSub, { color: colors.textMuted }]}
														numberOfLines={1}
													>
														{item.structured_formatting.secondary_text}
													</Text>
												</View>
												<Ionicons
													name="chevron-forward"
													size={14}
													color={colors.textMuted}
												/>
											</TouchableOpacity>
										)}
									/>
								)}
							</View>
						)}
					</View>

					<TouchableOpacity
						style={[
							styles.avatarBtn,
							{ backgroundColor: colors.card + "F5", borderColor: colors.border },
						]}
						onPress={() => navigation.navigate("SettingsNav")}
						activeOpacity={0.8}
					>
						<Text style={[styles.avatarInitial, { color: colors.text }]}>
							{user?.name?.charAt(0)?.toUpperCase() || "?"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Recenter button */}
			<TouchableOpacity
				style={[
					styles.recenterBtn,
					{ backgroundColor: colors.card, borderColor: colors.border },
				]}
				onPress={handleRecenter}
				activeOpacity={0.85}
			>
				{isLocating ? (
					<ActivityIndicator size="small" color={colors.primary} />
				) : (
					<Ionicons name="locate" size={22} color={colors.primary} />
				)}
			</TouchableOpacity>

			{/*
			 * ✅ Bottom sheet: fixed height + translateY animation
			 *   - useNativeDriver: true throughout (no height/color animated props)
			 *   - dragIndicator is a separate Animated.Value node
			 */}
			<Animated.View
				style={[
					styles.sheet,
					{ backgroundColor: colors.card, height: SHEET_FULL_HEIGHT },
					{ transform: [{ translateY: sheetTranslateY }] },
				]}
			>
				{/* Drag handle zone */}
				<View {...panResponder.panHandlers} style={styles.dragZone}>
					<Animated.View
						style={[
							styles.dragHandle,
							{ backgroundColor: colors.border },
							{ transform: [{ scaleX: dragIndicator }] },
						]}
					/>
					<TouchableOpacity
						style={StyleSheet.absoluteFill}
						onPress={() => (isExpanded.current ? snapToCollapsed() : snapToExpanded())}
						activeOpacity={1}
					/>
				</View>

				{/* Sheet body */}
				<View
					style={[
						styles.sheetContent,
						{ paddingBottom: Math.max(insets.bottom, 12) + 8 },
					]}
				>
					{/* Header row */}
					<View style={styles.sheetHeader}>
						<View>
							<Text style={[styles.sheetTitle, { color: colors.text }]}>
								Need Assistance?
							</Text>
							<Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
								{"We'll dispatch a driver to your location"}
							</Text>
						</View>
						<View
							style={[
								styles.etaBadge,
								{
									backgroundColor: colors.primary + "15",
									borderColor: colors.primary + "30",
								},
							]}
						>
							<View style={[styles.etaDot, { backgroundColor: colors.primary }]} />
							<Text style={[styles.etaText, { color: colors.primary }]}>{"<8 min"}</Text>
						</View>
					</View>

					<View style={[styles.divider, { backgroundColor: colors.border }]} />

					{/* Location card */}
					<TouchableOpacity
						style={[
							styles.locationCard,
							{
								backgroundColor: colors.background,
								borderColor: selectedLocation ? colors.primary + "50" : colors.border,
							},
						]}
						onPress={snapToExpanded}
						activeOpacity={0.85}
					>
						<View
							style={[styles.locationPinWrap, { backgroundColor: colors.primary + "15" }]}
						>
							{isLocating ? (
								<ActivityIndicator size="small" color={colors.primary} />
							) : (
								<Ionicons name="location" size={20} color={colors.primary} />
							)}
						</View>
						<View style={{ flex: 1, marginHorizontal: 14 }}>
							<Text style={[styles.locationLabel, { color: colors.textMuted }]}>
								YOUR LOCATION
							</Text>
							<Text
								style={[
									styles.locationAddress,
									{ color: selectedLocation ? colors.text : colors.textMuted },
								]}
								numberOfLines={2}
							>
								{isLocating
									? "Detecting your location..."
									: (selectedLocation?.address ?? "Long press the map to set a pin")}
							</Text>
						</View>
						<View style={[styles.editChip, { borderColor: colors.border }]}>
							<Ionicons name="pencil" size={12} color={colors.textMuted} />
						</View>
					</TouchableOpacity>

					{/* Info chips */}
					<View style={styles.infoRow}>
						{(
							[
								{ icon: "shield-checkmark-outline", label: "Verified" },
								{ icon: "card-outline", label: "Secure Pay" },
								{ icon: "eye-outline", label: "Live Track" },
							] as const
						).map(chip => (
							<View
								key={chip.label}
								style={[
									styles.infoChip,
									{ backgroundColor: colors.background, borderColor: colors.border },
								]}
							>
								<Ionicons name={chip.icon} size={13} color={colors.primary} />
								<Text style={[styles.infoChipText, { color: colors.textMuted }]}>
									{chip.label}
								</Text>
							</View>
						))}
					</View>

					<PrimaryButton
						title={isLocating ? "Detecting Location..." : "Get Help Now"}
						onPress={() => {
							if (selectedLocation) setJobStatus("selecting");
						}}
						disabled={!selectedLocation || isLocating}
					/>

					<Text style={[styles.hintText, { color: colors.textMuted }]}>
						Drag up or search to change your location
					</Text>
				</View>
			</Animated.View>
		</View>
	);
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#060B18" },

	permissionScreen: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 32,
	},
	permissionIcon: {
		width: 96,
		height: 96,
		borderRadius: 48,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	permissionTitle: {
		fontSize: 22,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 12,
	},
	permissionBody: { fontSize: 15, textAlign: "center", lineHeight: 24 },

	topOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
	topBar: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16 },

	searchWrapper: { flex: 1, marginRight: 12, zIndex: 30 },
	searchBox: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 13,
		borderRadius: 16,
		borderWidth: 1,
		elevation: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.18,
		shadowRadius: 6,
	},
	searchIcon: { marginRight: 10 },
	searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

	suggestions: {
		marginTop: 8,
		borderRadius: 16,
		borderWidth: 1,
		maxHeight: 260,
		overflow: "hidden",
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.22,
		shadowRadius: 10,
	},
	suggestionRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 10,
	},
	suggIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	suggMain: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
	suggSub: { fontSize: 12 },
	noResults: { padding: 24, alignItems: "center", gap: 8 },
	noResultsText: { fontSize: 14 },

	avatarBtn: {
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		elevation: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.18,
		shadowRadius: 6,
	},
	avatarInitial: { fontSize: 17, fontWeight: "700" },

	recenterBtn: {
		position: "absolute",
		right: 16,
		bottom: SHEET_PEEK_HEIGHT + 16,
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		zIndex: 10,
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
	},

	customPin: { alignItems: "center", justifyContent: "center" },
	pinPulse: {
		position: "absolute",
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#1A6BFF35",
	},
	pinDot: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2.5,
		borderColor: "#fff",
		elevation: 8,
		shadowColor: "#1A6BFF",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.5,
		shadowRadius: 6,
	},

	// Sheet: fixed height, translated via transform — NOT height animation
	sheet: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		overflow: "hidden",
		elevation: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.35,
		shadowRadius: 20,
	},
	dragZone: { paddingVertical: 14, alignItems: "center" },
	dragHandle: { width: 40, height: 4.5, borderRadius: 3 },
	sheetContent: { paddingHorizontal: 20, flex: 1 },

	sheetHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	sheetTitle: { fontSize: 22, fontWeight: "700", marginBottom: 3 },
	sheetSubtitle: { fontSize: 13 },
	etaBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1,
	},
	etaDot: { width: 6, height: 6, borderRadius: 3 },
	etaText: { fontSize: 13, fontWeight: "700" },
	divider: { height: 1, marginBottom: 16 },

	locationCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 18,
		borderWidth: 1.5,
		marginBottom: 14,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	locationPinWrap: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	locationLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },
	locationAddress: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
	editChip: {
		width: 28,
		height: 28,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},

	infoRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
	infoChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1,
		flex: 1,
	},
	infoChipText: { fontSize: 11, fontWeight: "500" },
	hintText: { fontSize: 12, textAlign: "center", marginTop: 10 },
});

// ── Dark map style ────────────────────────────────────────────────────────────
const darkMapStyle = [
	{ elementType: "geometry", stylers: [{ color: "#0d1424" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#8a9ab5" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#0d1424" }] },
	{ featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2235" }] },
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#060b18" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#243048" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.stroke",
		stylers: [{ color: "#1a6bff30" }],
	},
	{
		featureType: "road.highway",
		elementType: "labels.text.fill",
		stylers: [{ color: "#6b8abb" }],
	},
	{ featureType: "water", elementType: "geometry", stylers: [{ color: "#07101f" }] },
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#3d6196" }],
	},
	{ featureType: "poi", stylers: [{ visibility: "off" }] },
	{ featureType: "transit", stylers: [{ visibility: "off" }] },
	{
		featureType: "administrative",
		elementType: "geometry",
		stylers: [{ color: "#1a2235" }],
	},
	{
		featureType: "administrative.country",
		elementType: "labels.text.fill",
		stylers: [{ color: "#9e9e9e" }],
	},
	{ featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0d1a2a" }] },
];
