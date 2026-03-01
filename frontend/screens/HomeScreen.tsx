import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Linking,
	Platform,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useJob } from "../context/JobContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Default fallback region (Toronto)
const FALLBACK_REGION: Region = {
	latitude: 43.6532,
	longitude: -79.3832,
	latitudeDelta: 0.05,
	longitudeDelta: 0.05,
};

export const HomeScreen = () => {
	const { setCustomerLocation, setJobStatus } = useJob();
	const { user } = useAuth();
	const { colors } = useTheme();
	const navigation = useNavigation<any>();

	const bottomSheetRef = useRef<BottomSheet>(null);
	const snapPoints = useMemo(() => ["35%", "55%"], []);

	const [initialRegion, setInitialRegion] = useState<Region | null>(null);
	const [address, setAddress] = useState<string>("Locating...");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

	const initializeLocation = useCallback(async () => {
		try {
			setIsLoading(true);
			setPermissionDenied(false);

			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== "granted") {
				setPermissionDenied(true);
				setIsLoading(false);
				return;
			}

			let location = await Location.getLastKnownPositionAsync({});

			if (!location) {
				const locationPromise = Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});

				const timeoutPromise = new Promise<null>(resolve =>
					setTimeout(() => resolve(null), 8000),
				);

				const result = await Promise.race([locationPromise, timeoutPromise]);

				if (result) {
					location = result as Location.LocationObject;
				}
			}

			if (!location) {
				throw new Error("Could not fetch location in time");
			}

			const region: Region = {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			};

			let currentAddress = "Current Location";
			try {
				const [geocode] = await Location.reverseGeocodeAsync({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
				});

				if (geocode && geocode.length > 0) {
					const g = geocode[0];
					currentAddress =
						`${g.streetNumber || ""} ${g.street || ""}, ${g.city || ""}`.trim();
				}
			} catch (geocodeError) {
				console.warn("Reverse geocoding failed:", geocodeError);
			}

			setInitialRegion(region);
			setAddress(currentAddress);
			setCustomerLocation({
				latitude: region.latitude,
				longitude: region.longitude,
				address: currentAddress,
			});
			setIsLoading(false);
		} catch (error) {
			console.error("Error fetching location:", error);
			// Apply fallback region so map ALWAYS renders
			setInitialRegion(FALLBACK_REGION);
			setAddress("Location Unavailable");
			setCustomerLocation({
				latitude: FALLBACK_REGION.latitude,
				longitude: FALLBACK_REGION.longitude,
				address: "Location Unavailable",
			});
			setIsLoading(false);
		}
	}, [setCustomerLocation]);

	useEffect(() => {
		initializeLocation();
	}, [initializeLocation]);

	return (
		<View style={styles.container}>
			{/* Map Layer - Explicit 100% width/height to prevent collapsing */}
			{!isLoading && !permissionDenied && initialRegion && (
				<MapView
					style={styles.map}
					provider={PROVIDER_GOOGLE}
					initialRegion={initialRegion}
					showsUserLocation={true}
					showsMyLocationButton={true}
					showsCompass={true}
					toolbarEnabled={false}
				/>
			)}

			{/* Loading Overlay */}
			{isLoading && (
				<View style={[styles.overlayContainer, { backgroundColor: colors.background }]}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.textMuted }]}>
						Locating you...
					</Text>
				</View>
			)}

			{/* Permission Denied Overlay */}
			{!isLoading && permissionDenied && (
				<View style={[styles.overlayContainer, { backgroundColor: colors.background }]}>
					<Ionicons
						name="location-outline"
						size={64}
						color={colors.textMuted}
						style={styles.errorIcon}
					/>
					<Text style={[styles.errorTitle, { color: colors.text }]}>
						Location Required
					</Text>
					<Text style={[styles.errorText, { color: colors.textMuted }]}>
						Please enable location services to request roadside assistance.
					</Text>
					<PrimaryButton
						title="Enable Location"
						onPress={() => Linking.openSettings()}
						style={styles.permissionBtn}
					/>
					<TouchableOpacity style={styles.retryBtn} onPress={initializeLocation}>
						<Text style={[styles.retryText, { color: colors.primary }]}>
							I've enabled it, retry
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Top Bar Overlay */}
			<SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
				<View style={styles.topBar} pointerEvents="box-none">
					<View style={[styles.statusBadge, { backgroundColor: colors.card }]}>
						<View style={styles.statusDot} />
						<Text style={[styles.statusText, { color: colors.text }]}>GTA Online</Text>
					</View>

					<TouchableOpacity
						style={[styles.profileBtn, { backgroundColor: colors.card }]}
						onPress={() => navigation.navigate("SettingsNav")}
					>
						<Text style={[styles.profileInitial, { color: colors.text }]}>
							{user?.name?.charAt(0) || "?"}
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>

			{/* Bottom Sheet Overlay */}
			{!isLoading && !permissionDenied && initialRegion && (
				<BottomSheet
					ref={bottomSheetRef}
					index={0}
					snapPoints={snapPoints}
					enablePanDownToClose={false}
					handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
					backgroundStyle={{ backgroundColor: colors.card, borderRadius: 24 }}
					shadowStyle={{
						shadowColor: "#000",
						shadowOffset: { width: 0, height: -4 },
						shadowOpacity: 0.1,
						shadowRadius: 12,
						elevation: 20,
					}}
				>
					<BottomSheetView style={styles.bottomSheetContent}>
						<View style={styles.sheetHeader}>
							<Text style={[styles.title, { color: colors.text }]}>
								Need Roadside Assistance?
							</Text>
							<Text style={[styles.subtitle, { color: colors.textMuted }]}>
								Stranded? We're here to get you back on the road fast.
							</Text>
						</View>

						<View style={styles.quickActions}>
							<View style={styles.quickActionItem}>
								<View
									style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}
								>
									<Ionicons name="car-sport" size={24} color={colors.primary} />
								</View>
								<Text style={[styles.actionLabel, { color: colors.text }]}>Towing</Text>
							</View>
							<View style={styles.quickActionItem}>
								<View
									style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}
								>
									<Ionicons name="flash" size={24} color={colors.primary} />
								</View>
								<Text style={[styles.actionLabel, { color: colors.text }]}>Battery</Text>
							</View>
							<View style={styles.quickActionItem}>
								<View
									style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}
								>
									<Ionicons name="construct" size={24} color={colors.primary} />
								</View>
								<Text style={[styles.actionLabel, { color: colors.text }]}>
									Flat Tire
								</Text>
							</View>
							<View style={styles.quickActionItem}>
								<View
									style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}
								>
									<Ionicons name="water" size={24} color={colors.primary} />
								</View>
								<Text style={[styles.actionLabel, { color: colors.text }]}>Fuel</Text>
							</View>
						</View>

						<View
							style={[
								styles.locationCard,
								{ backgroundColor: colors.background, borderColor: colors.border },
							]}
						>
							<View
								style={[styles.locationIcon, { backgroundColor: colors.primary + "20" }]}
							>
								<Ionicons name="location" size={20} color={colors.primary} />
							</View>
							<View style={styles.locationTextContainer}>
								<Text style={[styles.locationLabel, { color: colors.textMuted }]}>
									Your Current Location
								</Text>
								<Text
									style={[styles.locationText, { color: colors.text }]}
									numberOfLines={1}
								>
									{address}
								</Text>
							</View>
							<TouchableOpacity onPress={initializeLocation} style={styles.refreshBtn}>
								<Ionicons name="refresh" size={20} color={colors.primary} />
							</TouchableOpacity>
						</View>

						<PrimaryButton
							title="Get Help Now"
							onPress={() => setJobStatus("selecting")}
							style={styles.mainCta}
						/>
					</BottomSheetView>
				</BottomSheet>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f3f4f6", // Light fallback color
	},
	map: {
		width: "100%",
		height: "100%",
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	overlayContainer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		zIndex: 20,
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		fontWeight: "500",
	},
	errorIcon: {
		marginBottom: 16,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 8,
	},
	errorText: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 24,
		lineHeight: 24,
	},
	permissionBtn: {
		width: "100%",
	},
	retryBtn: {
		marginTop: 16,
		padding: 12,
	},
	retryText: {
		fontSize: 16,
		fontWeight: "600",
	},
	headerSafeArea: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
	},
	topBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 16,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#10B981",
		marginRight: 8,
	},
	statusText: { fontSize: 14, fontWeight: "bold" },
	profileBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	profileInitial: { fontSize: 16, fontWeight: "bold" },
	bottomSheetContent: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 8,
	},
	sheetHeader: {
		marginBottom: 20,
	},
	title: {
		fontSize: 22,
		fontWeight: "800",
		marginBottom: 6,
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 15,
		lineHeight: 20,
		opacity: 0.8,
	},
	quickActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	quickActionItem: {
		alignItems: "center",
		width: (width - 48) / 4 - 8,
	},
	actionIcon: {
		width: 56,
		height: 56,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	actionLabel: {
		fontSize: 12,
		fontWeight: "600",
	},
	locationCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 20,
		borderWidth: 1,
		marginBottom: 24,
	},
	locationIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	locationTextContainer: {
		flex: 1,
	},
	locationLabel: {
		fontSize: 11,
		fontWeight: "700",
		marginBottom: 2,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	locationText: { fontSize: 15, fontWeight: "600" },
	refreshBtn: {
		padding: 8,
	},
	mainCta: {
		height: 56,
		borderRadius: 16,
	},
});
