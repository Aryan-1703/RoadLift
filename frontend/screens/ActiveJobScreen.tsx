import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useDriver } from "../context/DriverContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { LiveMap } from "../components/LiveMap";
import { ChatModal } from "../components/ChatModal";
import socketClient from "../services/socket";
import { Job } from "../types";

// ── Arrival geo-fence ─────────────────────────────────────────────────────────
const ARRIVAL_THRESHOLD_METERS = 150;

function haversineMeters(
	lat1: number, lon1: number,
	lat2: number, lon2: number,
): number {
	const R = 6371000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
		Math.cos((lat2 * Math.PI) / 180) *
		Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Status display config ─────────────────────────────────────────────────────
function statusConfig(status: string, colors: any) {
	switch (status.toLowerCase()) {
		case "arrived":
			return {
				label:   "Arrived",
				bg:      (colors.green ?? "#059669") + "20",
				color:   colors.green ?? "#059669",
			};
		case "in_progress":
			return {
				label:   "In Progress",
				bg:      (colors.amber ?? "#F59E0B") + "20",
				color:   colors.amber ?? "#F59E0B",
			};
		default: // accepted
			return {
				label:   "En Route",
				bg:      colors.primary + "20",
				color:   colors.primary,
			};
	}
}

export const ActiveJobScreen = () => {
	const { activeJob, updateJobStatus, cancelActiveJob } = useDriver();
	const { colors, isDarkMode } = useTheme();

	const [isUpdating,   setIsUpdating]   = useState(false);
	const [chatOpen,     setChatOpen]     = useState(false);
	const [driverLocation, setDriverLocation] = useState<{
		latitude: number; longitude: number;
	} | null>(null);

	// Ref so the location-watch closure always reads the latest job without
	// re-registering the subscription every time the status changes.
	const activeJobRef       = useRef<Job | null>(activeJob);
	const updateStatusRef    = useRef(updateJobStatus);
	const hasAutoArrivedRef  = useRef(false);

	useEffect(() => { activeJobRef.current    = activeJob;       }, [activeJob]);
	useEffect(() => { updateStatusRef.current = updateJobStatus; }, [updateJobStatus]);

	// Reset arrival guard when the job ID changes (new job assigned)
	useEffect(() => {
		hasAutoArrivedRef.current = false;
	}, [activeJob?.id]);

	// ── Location tracking + auto-arrive check ───────────────────────────────
	useEffect(() => {
		let locationSubscription: Location.LocationSubscription | null = null;

		const checkArrival = (coords: { latitude: number; longitude: number }) => {
			const job = activeJobRef.current;
			if (!job?.customerLocation)                                 return;
			if (hasAutoArrivedRef.current)                              return;
			if ((job.status as string).toLowerCase() !== "accepted")    return;

			const dist = haversineMeters(
				coords.latitude,  coords.longitude,
				job.customerLocation.latitude, job.customerLocation.longitude,
			);
			if (dist <= ARRIVAL_THRESHOLD_METERS) {
				hasAutoArrivedRef.current = true;
				updateStatusRef.current("ARRIVED").catch(() => {
					// If the call fails, allow retry on next tick
					hasAutoArrivedRef.current = false;
				});
			}
		};

		const startTracking = async () => {
			if (!activeJob) return;

			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Permission Denied",
					"We need your location to navigate to the customer.",
					[
						{ text: "Cancel", style: "cancel" },
						{ text: "Open Settings", onPress: () => Linking.openSettings() },
					],
				);
				return;
			}

			const initial = await Location.getCurrentPositionAsync({});
			const initialCoords = {
				latitude:  initial.coords.latitude,
				longitude: initial.coords.longitude,
			};
			setDriverLocation(initialCoords);
			socketClient.emit("driver-location-update", { jobId: activeJob.id, location: initialCoords });
			checkArrival(initialCoords);

			locationSubscription = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 0 },
				loc => {
					const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
					setDriverLocation(newCoords);
					socketClient.emit("driver-location-update", { jobId: activeJobRef.current?.id, location: newCoords });
					checkArrival(newCoords);
				},
			);
		};

		startTracking();
		return () => { locationSubscription?.remove(); };
	}, [activeJob?.id]);

	if (!activeJob) return null;

	const badge   = statusConfig(activeJob.status as string, colors);
	const isArrived = (activeJob.status as string).toLowerCase() === "arrived" ||
	                  (activeJob.status as string).toLowerCase() === "in_progress";
	const canCancel = ["accepted", "arrived"].includes((activeJob.status as string).toLowerCase());

	const customerName  = activeJob.customerName  || "Customer";
	const customerPhone = activeJob.customerPhone || null;

	const handleComplete = async () => {
		setIsUpdating(true);
		await updateJobStatus("COMPLETED");
		setIsUpdating(false);
	};

	const handleCallCustomer = () => {
		const phone = activeJob.isThirdParty
			? (activeJob.recipientPhone ?? activeJob.customerPhone)
			: activeJob.customerPhone;
		if (!phone) {
			Alert.alert("Contact Customer", "Customer phone number is not available.");
			return;
		}
		const url = `tel:${phone.replace(/\s/g, "")}`;
		Linking.canOpenURL(url).then(supported => {
			if (supported) Linking.openURL(url);
			else Alert.alert("Cannot make call", "Your device does not support phone calls.");
		});
	};

	const handleNavigate = () => {
		const loc = activeJob.customerLocation;
		if (!loc) return;
		const label = encodeURIComponent(loc.address || "Customer Location");
		Linking.openURL(`https://maps.google.com/?q=${loc.latitude},${loc.longitude}(${label})`)
			.catch(() => Alert.alert("Navigation", "Could not open maps application."));
	};

	const handleDriverCancel = () => {
		Alert.alert(
			"Cancel Job?",
			"The customer will be matched with another driver. Frequent cancellations may affect your account.",
			[
				{ text: "Keep Job", style: "cancel" },
				{
					text: "Cancel Job",
					style: "destructive",
					onPress: async () => {
						setIsUpdating(true);
						await cancelActiveJob();
						setIsUpdating(false);
					},
				},
			],
		);
	};

	return (
		<>
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

			{/* Header */}
			<View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
				<Text style={[styles.title, { color: colors.text }]}>Active Job</Text>
				<View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
					{isArrived && (
						<Ionicons name="checkmark-circle" size={13} color={badge.color} style={{ marginRight: 4 }} />
					)}
					<Text style={[styles.statusText, { color: badge.color }]}>
						{badge.label}
					</Text>
				</View>
			</View>

			{/* Map */}
			<View style={styles.mapContainer}>
				<LiveMap
					userLocation={activeJob.customerLocation || null}
					providerLocation={driverLocation}
					userTitle="Customer"
					providerTitle="You"
				/>
			</View>

			<ScrollView style={styles.detailsContainer} contentContainerStyle={{ paddingBottom: 8 }}>

				{/* Arrived banner — shown once auto-arrive triggers */}
				{isArrived && (
					<View style={[styles.arrivedBanner, {
						backgroundColor: (colors.green ?? "#059669") + "18",
						borderColor:     (colors.green ?? "#059669") + "40",
					}]}>
						<Ionicons name="location" size={20} color={colors.green ?? "#059669"} />
						<View style={{ flex: 1, marginLeft: 10 }}>
							<Text style={[styles.arrivedTitle, { color: colors.green ?? "#059669" }]}>
								You've arrived
							</Text>
							<Text style={[styles.arrivedSub, { color: colors.textMuted }]}>
								Tap "Complete Job" when the service is done
							</Text>
						</View>
					</View>
				)}

				{/* Contact card */}
				<Card style={styles.card}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						{activeJob.isThirdParty ? "CONTACT AT VEHICLE" : "CUSTOMER DETAILS"}
					</Text>
					<View style={styles.customerRow}>
						<View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
							<Ionicons name="person" size={24} color={colors.primary} />
						</View>
						<View style={styles.customerInfo}>
							<Text style={[styles.customerName, { color: colors.text }]}>
								{activeJob.isThirdParty ? (activeJob.recipientName ?? customerName) : customerName}
							</Text>
							<Text style={[styles.customerPhone, { color: colors.textMuted }]}>
								{activeJob.isThirdParty
									? (activeJob.recipientPhone ?? "Phone not available")
									: (customerPhone ?? "Phone not available")}
							</Text>
							{activeJob.isThirdParty && (
								<Text style={[styles.customerPhone, { color: colors.textMuted, marginTop: 2 }]}>
									Requested by: {customerName}
								</Text>
							)}
						</View>
						<TouchableOpacity
							onPress={handleCallCustomer}
							style={[styles.actionBtn, {
								backgroundColor: (activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone)
									? colors.greenBg : colors.border,
							}]}
							activeOpacity={0.7}
							disabled={!(activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone)}
						>
							<Ionicons
								name="call"
								size={20}
								color={(activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone)
									? colors.green : colors.textMuted}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setChatOpen(true)}
							style={[styles.actionBtn, { backgroundColor: colors.primary + "20", marginLeft: 8 }]}
							activeOpacity={0.7}
						>
							<Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
						</TouchableOpacity>
					</View>
				</Card>

				{/* Job details */}
				<Card style={styles.card}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>JOB DETAILS</Text>

					<View style={styles.detailRow}>
						<Ionicons name="car-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							{activeJob.serviceType
								?.split("-")
								.map(w => w.charAt(0).toUpperCase() + w.slice(1))
								.join(" ")}
						</Text>
					</View>

					<TouchableOpacity style={styles.detailRow} onPress={handleNavigate} activeOpacity={0.7}>
						<Ionicons name="navigate-outline" size={20} color={colors.primary} />
						<Text style={[styles.detailText, { color: colors.primary, textDecorationLine: "underline" }]}>
							{activeJob.customerLocation?.address || "Tap to navigate"}
						</Text>
					</TouchableOpacity>

					<View style={styles.detailRow}>
						<Ionicons name="cash-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							Estimated: ${activeJob.estimatedPrice}
						</Text>
					</View>

					{activeJob.notes ? (
						<View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
							<Text style={[styles.notesLabel, { color: colors.textMuted }]}>Notes:</Text>
							<Text style={[styles.notesText, { color: colors.text }]}>{activeJob.notes}</Text>
						</View>
					) : null}
				</Card>
			</ScrollView>

			{/* Footer */}
			<View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
				{(activeJob.status as string).toLowerCase() !== "payment" ? (
					<PrimaryButton
						title="Complete Job"
						onPress={handleComplete}
						isLoading={isUpdating}
						disabled={isUpdating}
					/>
				) : (
					<Text style={[styles.waitingText, { color: colors.textMuted }]}>
						Waiting for customer payment…
					</Text>
				)}
				{canCancel && (
					<PrimaryButton
						title="Cancel Job"
						variant="danger"
						onPress={handleDriverCancel}
						disabled={isUpdating}
						style={{ marginTop: 10 }}
					/>
				)}
			</View>

		</SafeAreaView>

		{activeJob.id && (
			<ChatModal
				jobId={String(activeJob.id)}
				visible={chatOpen}
				onClose={() => setChatOpen(false)}
			/>
		)}
		</>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection:     "row",
		justifyContent:    "space-between",
		alignItems:        "center",
		padding:           16,
		paddingBottom:     20,
		borderBottomWidth: 1,
	},
	title:       { fontSize: 24, fontWeight: "bold" },
	statusBadge: {
		flexDirection:    "row",
		alignItems:       "center",
		paddingHorizontal: 12,
		paddingVertical:   6,
		borderRadius:     12,
	},
	statusText: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },

	mapContainer:     { height: 250 },
	detailsContainer: { flex: 1, padding: 16 },

	// Arrived banner
	arrivedBanner: {
		flexDirection:    "row",
		alignItems:       "center",
		borderRadius:     14,
		borderWidth:      1,
		padding:          14,
		marginBottom:     14,
	},
	arrivedTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
	arrivedSub:   { fontSize: 12 },

	card:         { marginBottom: 16, padding: 16 },
	sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 16, letterSpacing: 0.5 },

	customerRow:   { flexDirection: "row", alignItems: "center" },
	avatar: {
		width: 48, height: 48, borderRadius: 24,
		alignItems: "center", justifyContent: "center", marginRight: 16,
	},
	customerInfo:  { flex: 1 },
	customerName:  { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
	customerPhone: { fontSize: 14 },
	actionBtn: {
		width: 40, height: 40, borderRadius: 20,
		alignItems: "center", justifyContent: "center",
	},

	detailRow:  { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	detailText: { fontSize: 16, marginLeft: 12, flex: 1 },
	notesContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
	notesLabel: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
	notesText:  { fontSize: 14, fontStyle: "italic" },

	footer:      { padding: 16, borderTopWidth: 1 },
	waitingText: { textAlign: "center", fontSize: 16, fontStyle: "italic", paddingVertical: 12 },
});
