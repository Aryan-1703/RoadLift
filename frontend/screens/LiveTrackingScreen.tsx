import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Linking,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { LiveMap } from "../components/LiveMap";
import { PrimaryButton } from "../components/PrimaryButton";
import { ChatModal } from "../components/ChatModal";
import { Ionicons } from "@expo/vector-icons";

export const LiveTrackingScreen = () => {
	const { job, providerLocation, eta, cancelJob, setCustomerLocation, searchTimedOut, travelFee, searchMessage } =
		useJob();
	const { colors } = useTheme();
	const [locationError, setLocationError] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);

	// Local copy of the customer's GPS — used directly by LiveMap so the map
	// always has a valid coordinate even if job.customerLocation is briefly null.
	const [mapLocation, setMapLocation] = useState(job.customerLocation);

	// ── Track customer location ──────────────────────────────────────────────
	useEffect(() => {
		let locationSubscription: Location.LocationSubscription | null = null;

		const startTracking = async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				setLocationError(true);
				Alert.alert(
					"Permission Denied",
					"We need your location to show the driver where you are.",
					[
						{ text: "Cancel", style: "cancel" },
						{ text: "Open Settings", onPress: () => Linking.openSettings() },
					],
				);
				return;
			}

			// Use last-known first (instant, no GPS warm-up delay)
			const last = await Location.getLastKnownPositionAsync();
			if (last) {
				const loc = { latitude: last.coords.latitude, longitude: last.coords.longitude };
				setMapLocation(loc);
				setCustomerLocation(loc);
			}

			// Then get a fresh fix
			const location = await Location.getCurrentPositionAsync({});
			const fresh = { latitude: location.coords.latitude, longitude: location.coords.longitude };
			setMapLocation(fresh);
			setCustomerLocation(fresh);

			locationSubscription = await Location.watchPositionAsync(
				{
					accuracy:         Location.Accuracy.High,
					timeInterval:     4000,
					distanceInterval: 0,  // fire on time interval even when stationary
				},
				loc => {
					const updated = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
					setMapLocation(updated);
					setCustomerLocation(updated);
				},
			);
		};

		startTracking();

		return () => {
			if (locationSubscription) {
				locationSubscription.remove();
			}
		};
	}, [setCustomerLocation]);

	// ── Cancel with confirmation ─────────────────────────────────────────────
	const handleCancelRequest = () => {
		const driverAssigned = job.status === "tracking" || job.status === "arrived" || job.status === "in_progress";

		if (driverAssigned) {
			Alert.alert(
				"Cancel Service?",
				"A $5.00 cancellation fee applies since a driver has already been assigned and is on their way.",
				[
					{ text: "Keep Service", style: "cancel" },
					{ text: "Cancel Anyway ($5 fee)", style: "destructive", onPress: () => cancelJob() },
				],
			);
		} else {
			Alert.alert(
				"Cancel Request?",
				"Are you sure you want to cancel your service request?",
				[
					{ text: "No", style: "cancel" },
					{ text: "Yes, Cancel", style: "destructive", onPress: () => cancelJob() },
				],
			);
		}
	};

	// ── Call driver helper ───────────────────────────────────────────────────
	const handleCallDriver = () => {
		const phone = job.provider?.phone;
		if (!phone) {
			Alert.alert("Contact Driver", "Driver contact is not available right now.");
			return;
		}
		const url = `tel:${phone.replace(/\s/g, "")}`;
		Linking.canOpenURL(url).then(supported => {
			if (supported) {
				Linking.openURL(url);
			} else {
				Alert.alert("Cannot make call", "Your device does not support phone calls.");
			}
		});
	};

	// ── "No drivers available" state ─────────────────────────────────────────
	if (searchTimedOut) {
		return (
			<SafeAreaView style={[styles.searchingContainer, { backgroundColor: colors.background }]}>
				<View style={styles.searchingContent}>
					<View style={[styles.noDriversIcon, { backgroundColor: colors.amberBg }]}>
						<Ionicons name="car-outline" size={48} color={colors.amber} />
					</View>
					<Text style={[styles.searchingTitle, { color: colors.text }]}>
						No Drivers Available
					</Text>
					<Text style={[styles.searchingDesc, { color: colors.textMuted }]}>
						We couldn't find a nearby provider right now. Please try again in a few
						minutes or contact support.
					</Text>
				</View>
				<View style={styles.cancelWrap}>
					<PrimaryButton title="Try Again" onPress={cancelJob} />
				</View>
			</SafeAreaView>
		);
	}

	// ── Searching state ──────────────────────────────────────────────────────
	if (job.status === "searching") {
		const displayPrice = job.currentPrice ?? job.estimatedPrice;
		const isExpanding  = (job.dispatchStage ?? 0) > 0;

		return (
			<SafeAreaView style={[styles.searchingContainer, { backgroundColor: colors.background }]}>
				<View style={styles.searchingContent}>
					<ActivityIndicator
						size="large"
						color={colors.primary}
						style={{ transform: [{ scale: 2 }], marginBottom: 40 }}
					/>
					<Text style={[styles.searchingTitle, { color: colors.text }]}>
						Finding a Provider
					</Text>

					{/* Dynamic radius / price message */}
					{searchMessage ? (
						<View style={[styles.radiusBadge, { backgroundColor: colors.primary + "18" }]}>
							<Ionicons name="radio-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
							<Text style={[styles.radiusText, { color: colors.primary }]}>
								{searchMessage}
							</Text>
						</View>
					) : (
						<Text style={[styles.searchingDesc, { color: colors.textMuted }]}>
							We're locating the nearest available provider for you.
						</Text>
					)}

					{/* Show updated price only when a travel fee has been added */}
					{isExpanding && displayPrice != null && (
						<View style={[styles.priceRow, { borderColor: colors.border }]}>
							<Text style={[styles.priceLabel, { color: colors.textMuted }]}>
								Updated estimate
							</Text>
							<Text style={[styles.priceValue, { color: colors.text }]}>
								${displayPrice.toFixed(2)}
								{travelFee > 0 && (
									<Text style={{ color: colors.amber ?? "#F59E0B", fontSize: 13 }}>
										{" "}(+${travelFee} travel fee)
									</Text>
								)}
							</Text>
						</View>
					)}

					<Text style={[styles.searchingHint, { color: colors.textMuted }]}>
						{isExpanding
							? `Searching within ${job.currentRadius ?? 5} km radius...`
							: "This usually takes 1–3 minutes."}
					</Text>
				</View>
				<View style={styles.cancelWrap}>
					<PrimaryButton title="Cancel Request" variant="danger" onPress={handleCancelRequest} />
				</View>
			</SafeAreaView>
		);
	}

	// ── Banner config per status ─────────────────────────────────────────────
	const bannerConfig = (() => {
		if (job.status === "arrived") {
			return {
				label: "DRIVER ARRIVED",
				etaValue: "Here",
				etaLabel: "Provider On-Site",
				badgeColor: colors.green ?? "#059669",
			};
		}
		if (job.status === "in_progress") {
			return {
				label: "SERVICE IN PROGRESS",
				etaValue: "Active",
				etaLabel: "Work Underway",
				badgeColor: colors.amber ?? "#F59E0B",
			};
		}
		// default: tracking (en route)
		return {
			label: "PROVIDER EN ROUTE",
			etaValue: eta ? `${eta} min` : "--",
			etaLabel: "Estimated Arrival",
			badgeColor: colors.primary,
		};
	})();

	// ── Tracking state ───────────────────────────────────────────────────────
	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.safeTop}>
				<View
					style={[
						styles.topBanner,
						{ backgroundColor: colors.card, borderColor: colors.border },
					]}
				>
					<Text style={[styles.bannerTitle, { color: colors.textMuted }]}>
						{bannerConfig.label}
					</Text>
					<View style={styles.bannerRow}>
						<View>
							<Text style={[styles.etaText, { color: bannerConfig.badgeColor }]}>
								{bannerConfig.etaValue}
							</Text>
							<Text style={[styles.etaLabel, { color: colors.text }]}>
								{bannerConfig.etaLabel}
							</Text>
						</View>
						<View style={[styles.vehicleBadge, { backgroundColor: colors.background }]}>
							<Text style={[styles.vehicleText, { color: colors.text }]}>
								{job.provider?.vehicle || "Tow Truck"}
							</Text>
						</View>
					</View>
				</View>
			</SafeAreaView>

			<LiveMap
				userLocation={mapLocation ?? job.customerLocation}
				providerLocation={providerLocation}
				style={styles.map}
			/>

			<View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
				<View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

				<View style={styles.providerRow}>
					<View style={[styles.avatar, { borderColor: colors.background }]}>
						<Ionicons name="person" size={24} color="#9CA3AF" />
					</View>
					<View style={styles.providerInfo}>
						<Text style={[styles.providerName, { color: colors.text }]}>
							{job.provider?.name || "Driver"}
						</Text>
						<View style={styles.ratingRow}>
							<Ionicons name="star" size={14} color="#FBBF24" />
							<Text style={[styles.ratingText, { color: colors.textMuted }]}>
								{" "}
								{job.provider?.rating || "5.0"} Rating
							</Text>
						</View>
					</View>
					{/* ── Call button — now wired up ── */}
					<TouchableOpacity
						onPress={handleCallDriver}
						style={[styles.actionBtn, { backgroundColor: colors.primary + "20" }]}
						activeOpacity={0.7}
					>
						<Ionicons name="call" size={20} color={colors.primary} />
					</TouchableOpacity>
					{/* ── Chat button ── */}
					<TouchableOpacity
						onPress={() => setChatOpen(true)}
						style={[styles.actionBtn, { backgroundColor: colors.primary + "20", marginLeft: 8 }]}
						activeOpacity={0.7}
					>
						<Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
					</TouchableOpacity>
				</View>

				<PrimaryButton title="Cancel Request" variant="secondary" onPress={handleCancelRequest} />
			</View>

			{job.id && (
				<ChatModal
					jobId={String(job.id)}
					visible={chatOpen}
					onClose={() => setChatOpen(false)}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	searchingContainer: { flex: 1, justifyContent: "space-between" },
	searchingContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 32,
	},
	noDriversIcon: {
		width: 96,
		height: 96,
		borderRadius: 48,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 32,
	},
	searchingTitle:  { fontSize: 24, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
	searchingDesc:   { fontSize: 16, textAlign: "center", lineHeight: 24 },
	searchingHint:   { fontSize: 13, textAlign: "center", marginTop: 12, fontStyle: "italic" },
	radiusBadge: {
		flexDirection:  "row",
		alignItems:     "center",
		paddingHorizontal: 14,
		paddingVertical:   8,
		borderRadius:   20,
		marginTop:      16,
		marginBottom:   4,
	},
	radiusText: { fontSize: 14, fontWeight: "600" },
	priceRow: {
		marginTop:    16,
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderWidth:  1,
		borderRadius: 12,
		alignItems:   "center",
	},
	priceLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
	priceValue: { fontSize: 22, fontWeight: "bold" },
	cancelWrap:      { padding: 24 },
	container:       { flex: 1 },
	map:             { flex: 1 },
	safeTop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	topBanner: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	bannerTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 8 },
	bannerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-end",
	},
	etaText:       { fontSize: 32, fontWeight: "900" },
	etaLabel:      { fontSize: 12, fontWeight: "bold" },
	vehicleBadge:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
	vehicleText:   { fontSize: 10, fontWeight: "bold" },
	bottomSheet: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
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
	providerRow:   { flexDirection: "row", alignItems: "center", marginBottom: 24 },
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#E5E7EB",
		borderWidth: 3,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	providerInfo:  { flex: 1 },
	providerName:  { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
	ratingRow:     { flexDirection: "row", alignItems: "center" },
	ratingText:    { fontSize: 14, fontWeight: "bold" },
	actionBtn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
});
