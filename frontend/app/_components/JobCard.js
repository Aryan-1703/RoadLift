// JobCard.jsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const serviceIcons = {
	"battery-boost": "car-battery",
	"car-lockout": "key-variant",
	"tire-change": "tire",
	"fuel-delivery": "gas-station",
	towing: "tow-truck",
};

const JobCard = ({ job, distanceKm, onAccept }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];

	const getDistanceColor = distance => {
		if (distance < 3) return "#4caf50";
		if (distance < 7) return "#ff9800";
		return "#f44336";
	};

	const distanceText =
		distanceKm !== undefined
			? `${parseFloat(distanceKm).toFixed(1)} km away`
			: "Distance N/A";

	const distanceColor =
		distanceKm !== undefined ? getDistanceColor(distanceKm) : colors.tabIconDefault;

	const isHighPayout = parseFloat(job.estimatedCost) >= 100;
	const relativeTimeText = dayjs(job.createdAt).fromNow(); // e.g., "5 minutes ago"

	return (
		<View
			style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}
		>
			{/* Header */}
			<View style={styles.header}>
				<View style={[styles.iconWrapper, { backgroundColor: `${colors.tint}20` }]}>
					<MaterialCommunityIcons
						name={serviceIcons[job.serviceType] || "alert-circle"}
						size={28}
						color={colors.tint}
					/>
				</View>
				<View>
					<Text style={[styles.title, { color: colors.text }]}>
						{job.serviceType.replace("-", " ").toUpperCase()}
					</Text>
					<Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
						Requested by {job.User?.name || "Customer"}
					</Text>
					<Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
						🕒 {relativeTimeText}
					</Text>
				</View>
			</View>

			{/* High payout badge */}
			{isHighPayout && (
				<View style={styles.badge}>
					<Text style={styles.badgeText}>🔥 High Payout</Text>
				</View>
			)}

			{/* Details */}
			<View style={styles.detailsRow}>
				<View style={styles.detailItem}>
					<FontAwesome5 name="map-marker-alt" size={16} color={colors.tabIconDefault} />
					<Text style={[styles.detailText, { color: distanceColor }]}>
						{distanceText}
					</Text>
				</View>
				<View style={styles.detailItem}>
					<FontAwesome5 name="dollar-sign" size={16} color={colors.tabIconDefault} />
					<Text style={[styles.detailText, { color: colors.text }]}>
						${parseFloat(job.estimatedCost).toFixed(2)}
					</Text>
				</View>
			</View>

			{/* Notes */}
			{job.notes && (
				<Text style={[styles.notes, { color: colors.tabIconDefault }]}>
					📝 {job.notes}
				</Text>
			)}

			{/* CTA */}
			<TouchableOpacity
				style={[styles.button, { backgroundColor: colors.tint }]}
				onPress={onAccept}
			>
				<Text style={styles.buttonText}>View & Accept</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		borderRadius: 18,
		padding: 18,
		marginHorizontal: 16,
		marginBottom: 20,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 3,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	iconWrapper: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 14,
		marginTop: 4,
	},
	timeText: {
		fontSize: 12,
		marginTop: 2,
	},
	detailsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 10,
		paddingVertical: 14,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#ddd",
	},
	detailItem: {
		alignItems: "center",
		flex: 1,
	},
	detailText: {
		marginTop: 6,
		fontSize: 15,
		fontWeight: "500",
	},
	notes: {
		marginTop: 14,
		fontSize: 14,
		fontStyle: "italic",
	},
	button: {
		marginTop: 16,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	badge: {
		alignSelf: "flex-start",
		backgroundColor: "#FFD700",
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginBottom: 6,
	},
	badgeText: {
		color: "#000",
		fontSize: 12,
		fontWeight: "600",
	},
});

export default JobCard;
