import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SafeAreaView,
	ScrollView,
	Alert,
	Linking,
} from "react-native";
import * as Location from "expo-location";
import { useDriver } from "../context/DriverContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { LiveMap } from "../components/LiveMap";
import socketClient from "../services/socket";

export const ActiveJobScreen = () => {
	const { activeJob, updateJobStatus } = useDriver();
	const { colors } = useTheme();
	const [isUpdating, setIsUpdating] = useState(false);
	const [driverLocation, setDriverLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);

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
			setDriverLocation({
				latitude: initialLocation.coords.latitude,
				longitude: initialLocation.coords.longitude,
			});

			locationSubscription = await Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.High,
					timeInterval: 5000,
					distanceInterval: 10,
				},
				loc => {
					const newLocation = {
						latitude: loc.coords.latitude,
						longitude: loc.coords.longitude,
					};
					setDriverLocation(newLocation);

					// Emit location to backend
					socketClient.emit("driver-location-update", {
						jobId: activeJob.id,
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
		switch (activeJob.status) {
			case "ACCEPTED":
				return { status: "ARRIVED", label: "Mark as Arrived" };
			case "ARRIVED":
				return { status: "IN_PROGRESS", label: "Start Service" };
			case "IN_PROGRESS":
				return { status: "COMPLETED", label: "Complete Job" };
			default:
				return null;
		}
	};

	const nextAction = getNextStatus();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{ borderBottomColor: colors.border, backgroundColor: colors.card },
				]}
			>
				<Text style={[styles.title, { color: colors.text }]}>Active Request</Text>
				<View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
					<Text style={[styles.statusText, { color: colors.primary }]}>
						{activeJob.status.replace("_", " ")}
					</Text>
				</View>
			</View>

			<View style={styles.mapContainer}>
				<LiveMap
					userLocation={activeJob.customerLocation || null}
					providerLocation={driverLocation}
					userTitle="Customer"
					providerTitle="You"
				/>
			</View>

			<ScrollView style={styles.detailsContainer}>
				<Card style={styles.card}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						CUSTOMER DETAILS
					</Text>
					<View style={styles.customerRow}>
						<View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
							<Ionicons name="person" size={24} color={colors.primary} />
						</View>
						<View style={styles.customerInfo}>
							<Text style={[styles.customerName, { color: colors.text }]}>Customer</Text>
							<Text style={[styles.customerPhone, { color: colors.textMuted }]}>
								Contact via App
							</Text>
						</View>
						<TouchableOpacity style={[styles.callBtn, { backgroundColor: "#10B98120" }]}>
							<Ionicons name="call" size={20} color="#10B981" />
						</TouchableOpacity>
					</View>
				</Card>

				<Card style={styles.card}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						JOB DETAILS
					</Text>
					<View style={styles.detailRow}>
						<Ionicons name="car-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							{activeJob.serviceType}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="location-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							{activeJob.customerLocation?.address || "Unknown Location"}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="cash-outline" size={20} color={colors.textMuted} />
						<Text style={[styles.detailText, { color: colors.text }]}>
							Estimated: ${activeJob.estimatedPrice}
						</Text>
					</View>
					{activeJob.notes && (
						<View style={styles.notesContainer}>
							<Text style={[styles.notesLabel, { color: colors.textMuted }]}>Notes:</Text>
							<Text style={[styles.notesText, { color: colors.text }]}>
								{activeJob.notes}
							</Text>
						</View>
					)}
				</Card>
			</ScrollView>

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
						Waiting for customer payment...
					</Text>
				)}
			</View>
		</SafeAreaView>
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
	title: { fontSize: 24, fontWeight: "bold" },
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
	statusText: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
	mapContainer: { height: 250 },
	detailsContainer: { flex: 1, padding: 16 },
	card: { marginBottom: 16, padding: 16 },
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
	customerInfo: { flex: 1 },
	customerName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
	customerPhone: { fontSize: 14 },
	callBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	detailText: { fontSize: 16, marginLeft: 12, flex: 1 },
	notesContainer: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	notesLabel: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
	notesText: { fontSize: 14, fontStyle: "italic" },
	footer: { padding: 16, borderTopWidth: 1 },
	waitingText: {
		textAlign: "center",
		fontSize: 16,
		fontStyle: "italic",
		paddingVertical: 12,
	},
});
