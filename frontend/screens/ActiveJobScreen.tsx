import React, { useState, useEffect } from "react";
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
import { useDriver } from "../context/DriverContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { LiveMap } from "../components/LiveMap";
import { ChatModal } from "../components/ChatModal";
import socketClient from "../services/socket";

export const ActiveJobScreen = () => {
	const { activeJob, updateJobStatus, cancelActiveJob } = useDriver();
	const { colors } = useTheme();
	const [isUpdating, setIsUpdating] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [driverLocation, setDriverLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);

	// ── Track driver location ────────────────────────────────────────────────
	useEffect(() => {
		let locationSubscription: Location.LocationSubscription | null = null;

		const startTracking = async () => {
			if (!activeJob) return;

			let { status } = await Location.requestForegroundPermissionsAsync();
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

			const initialLocation = await Location.getCurrentPositionAsync({});
			const initialCoords = {
				latitude:  initialLocation.coords.latitude,
				longitude: initialLocation.coords.longitude,
			};
			setDriverLocation(initialCoords);
			// Emit immediately so customer sees driver pin right away
			socketClient.emit("driver-location-update", {
				jobId:    activeJob.id,
				location: initialCoords,
			});

			locationSubscription = await Location.watchPositionAsync(
				{
					accuracy:         Location.Accuracy.High,
					timeInterval:     4000,
					distanceInterval: 0, // fire on time interval even when stationary
				},
				loc => {
					const newLocation = {
						latitude:  loc.coords.latitude,
						longitude: loc.coords.longitude,
					};
					setDriverLocation(newLocation);
					socketClient.emit("driver-location-update", {
						jobId:    activeJob.id,
						location: newLocation,
					});
				},
			);
		};

		startTracking();

		return () => {
			if (locationSubscription) {
				locationSubscription.remove();
			}
		};
	}, [activeJob?.id]);

	if (!activeJob) return null;

	const handleStatusUpdate = async (newStatus: string) => {
		setIsUpdating(true);
		await updateJobStatus(newStatus);
		setIsUpdating(false);
	};

	const getNextStatus = () => {
		const s = (activeJob.status as string).toLowerCase();
		switch (s) {
			case "accepted":
				return { status: "ARRIVED",     label: "Mark as Arrived" };
			case "arrived":
				return { status: "IN_PROGRESS", label: "Start Service" };
			case "in_progress":
				return { status: "COMPLETED",   label: "Complete Job" };
			default:
				return null;
		}
	};

	// ── Call customer (or recipient if third-party) ─────────────────────────
	const handleCallCustomer = () => {
		const phone = activeJob.isThirdParty ? (activeJob.recipientPhone ?? activeJob.customerPhone) : activeJob.customerPhone;
		if (!phone) {
			Alert.alert("Contact Customer", "Customer phone number is not available.");
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

	// ── Open GPS navigation to customer ─────────────────────────────────────
	const handleNavigate = () => {
		const loc = activeJob.customerLocation;
		if (!loc) return;
		const { latitude, longitude, address } = loc;
		const label = encodeURIComponent(address || "Customer Location");
		// Works on both iOS (Apple Maps) and Android (Google Maps)
		const url = `https://maps.google.com/?q=${latitude},${longitude}(${label})`;
		Linking.openURL(url).catch(() =>
			Alert.alert("Navigation", "Could not open maps application."),
		);
	};

	const handleDriverCancel = () => {
		Alert.alert(
			"Cancel Job?",
			"Are you sure you want to cancel? The customer will be matched with another driver. Frequent cancellations may affect your account standing.",
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

	const nextAction = getNextStatus();
	const customerName  = activeJob.customerName  || "Customer";
	const customerPhone = activeJob.customerPhone || null;

	return (
		<>
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View
				style={[
					styles.header,
					{ borderBottomColor: colors.border, backgroundColor: colors.card },
				]}
			>
				<Text style={[styles.title, { color: colors.text }]}>Active Request</Text>
				<View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
					<Text style={[styles.statusText, { color: colors.primary }]}>
						{(activeJob.status as string).replace("_", " ")}
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

			<ScrollView style={styles.detailsContainer}>
				{/* Customer / Contact details */}
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
						{/* Call button */}
						<TouchableOpacity
							onPress={handleCallCustomer}
							style={[
								styles.actionBtn,
								{
									backgroundColor: (activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone)
										? colors.greenBg
										: colors.border,
								},
							]}
							activeOpacity={0.7}
							disabled={!(activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone)}
						>
							<Ionicons
								name="call"
								size={20}
								color={(activeJob.isThirdParty ? activeJob.recipientPhone : customerPhone) ? colors.green : colors.textMuted}
							/>
						</TouchableOpacity>
						{/* Chat button */}
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
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						JOB DETAILS
					</Text>

					<View style={styles.detailRow}>
						<Ionicons name="car-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							{activeJob.serviceType
								?.split("-")
								.map(word => word.charAt(0).toUpperCase() + word.slice(1))
								.join(" ")}
						</Text>
					</View>

					<TouchableOpacity
						style={styles.detailRow}
						onPress={handleNavigate}
						activeOpacity={0.7}
					>
						<Ionicons name="navigate-outline" size={20} color={colors.primary} />
						<Text
							style={[styles.detailText, { color: colors.primary, textDecorationLine: "underline" }]}
						>
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
							<Text style={[styles.notesLabel, { color: colors.textMuted }]}>
								Notes:
							</Text>
							<Text style={[styles.notesText, { color: colors.text }]}>
								{activeJob.notes}
							</Text>
						</View>
					) : null}
				</Card>
			</ScrollView>

			{/* Footer action */}
			<View
				style={[
					styles.footer,
					{ backgroundColor: colors.card, borderTopColor: colors.border },
				]}
			>
				{nextAction ? (
					<PrimaryButton
						title={nextAction.label}
						onPress={() => handleStatusUpdate(nextAction.status)}
						isLoading={isUpdating}
						disabled={isUpdating}
					/>
				) : (
					<Text style={[styles.waitingText, { color: colors.textMuted }]}>
						Waiting for customer payment…
					</Text>
				)}
				{(activeJob.status === "accepted" || activeJob.status === "arrived") && (
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
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		paddingBottom: 20,
		borderBottomWidth: 1,
	},
	title:       { fontSize: 24, fontWeight: "bold" },
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
	statusText:  { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
	mapContainer:     { height: 250 },
	detailsContainer: { flex: 1, padding: 16 },
	card:        { marginBottom: 16, padding: 16 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "bold",
		marginBottom: 16,
		letterSpacing: 0.5,
	},
	customerRow: { flexDirection: "row", alignItems: "center" },
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	customerInfo:  { flex: 1 },
	customerName:  { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
	customerPhone: { fontSize: 14 },
	actionBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	detailRow:   { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	detailText:  { fontSize: 16, marginLeft: 12, flex: 1 },
	notesContainer: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
	},
	notesLabel: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
	notesText:  { fontSize: 14, fontStyle: "italic" },
	footer:      { padding: 16, borderTopWidth: 1 },
	waitingText: {
		textAlign: "center",
		fontSize: 16,
		fontStyle: "italic",
		paddingVertical: 12,
	},
});
