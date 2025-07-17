import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

// Icons based on job type
const serviceIcons = {
	"battery-boost": "car-battery",
	"car-lockout": "key-variant",
	"tire-change": "tire",
	towing: "tow-truck",
};

const JobCard = ({ job, distanceKm, onAccept }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];
	// Determine color based on distance
	const getDistanceColor = distance => {
		if (distance < 3) return "#4caf50"; // green
		if (distance < 7) return "#ff9800"; // orange
		return "#f44336"; // red
	};
	const distanceText =
		distanceKm !== undefined
			? `${parseFloat(distanceKm).toFixed(1)} km away`
			: "Distance N/A";

	const distanceColor =
		distanceKm !== undefined ? getDistanceColor(distanceKm) : colors.tabIconDefault;

	return (
		<View
			style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}
		>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={[styles.iconContainer, { backgroundColor: `${colors.tint}20` }]}>
					<MaterialCommunityIcons
						name={serviceIcons[job.serviceType] || "alert-circle"}
						size={28}
						color={colors.tint}
					/>
				</View>
				<View style={styles.headerTextContainer}>
					<Text style={[styles.serviceType, { color: colors.text }]}>
						{job.serviceType.replace("-", " ").toUpperCase()}
					</Text>
					<Text style={[styles.customerName, { color: colors.tabIconDefault }]}>
						Request from {job.User?.name || "Customer"}
					</Text>
				</View>
			</View>

			{/* Details Section */}
			<View style={styles.detailsRow}>
				{/* Distance */}
				<View style={styles.detailItem}>
					<FontAwesome5 name="map-marker-alt" size={16} color={colors.tabIconDefault} />
					<Text style={[styles.detailText, { color: distanceColor }]}>
						{distanceText}
					</Text>
				</View>

				{/* Estimated Payout */}
				<View style={styles.detailItem}>
					<FontAwesome5 name="dollar-sign" size={16} color={colors.tabIconDefault} />
					<Text style={[styles.detailText, { color: colors.text }]}>
						${parseFloat(job.estimatedCost).toFixed(2)} Payout
					</Text>
				</View>
			</View>

			{/* Notes Section */}
			{job.notes && (
				<View style={styles.notesContainer}>
					<Text style={[styles.notesText, { color: colors.tabIconDefault }]}>
						Notes: {job.notes}
					</Text>
				</View>
			)}

			{/* Action Button */}
			<TouchableOpacity
				style={[styles.button, { backgroundColor: colors.tint }]}
				onPress={onAccept}
			>
				<Text style={styles.buttonText}>View & Accept Job</Text>
			</TouchableOpacity>
		</View>
	);
};

export default JobCard;

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 18,
		marginHorizontal: 15,
		marginBottom: 15,
		elevation: 2,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	header: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
	iconContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 15,
	},
	headerTextContainer: { flex: 1 },
	serviceType: { fontSize: 18, fontWeight: "bold" },
	customerName: { fontSize: 14, marginTop: 2 },
	detailsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 15,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#eee",
	},
	detailItem: { alignItems: "center" },
	detailText: { fontSize: 16, fontWeight: "500", marginTop: 5 },
	notesContainer: { marginVertical: 15 },
	notesText: { fontStyle: "italic", fontSize: 14 },
	button: {
		marginTop: 10,
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
