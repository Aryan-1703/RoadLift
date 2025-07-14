import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

const JobCard = ({ job, onAccept }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];

	// Function to format the service type for display
	const formatServiceType = type => {
		return type.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
	};

	return (
		<View
			style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
		>
			<View style={styles.header}>
				<FontAwesome5 name="route" size={20} color={colors.text} />
				<Text style={[styles.serviceType, { color: colors.text }]}>
					{formatServiceType(job.serviceType)}
				</Text>
			</View>

			<View style={styles.details}>
				<Text style={[styles.detailText, { color: colors.text }]}>
					Customer: {job.User?.name || "N/A"}
				</Text>
				{job.notes && (
					<Text style={[styles.detailText, { color: colors.text }]}>
						Notes: {job.notes}
					</Text>
				)}
			</View>

			<View style={styles.footer}>
				<Text style={[styles.payoutLabel, { color: colors.text }]}>Payout</Text>
				<Text style={[styles.payoutValue, { color: colors.tint }]}>
					${job.estimatedCost ? parseFloat(job.estimatedCost).toFixed(2) : "0.00"}
				</Text>
			</View>

			<TouchableOpacity
				style={[styles.button, { backgroundColor: colors.tint }]}
				onPress={onAccept}
			>
				<Text style={styles.buttonText}>Accept Job</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 20,
		marginHorizontal: 15,
		marginBottom: 15,
		borderWidth: 1,
		// Shadows for iOS/Android
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0", // This will be themed in the component
		paddingBottom: 10,
		marginBottom: 10,
	},
	serviceType: {
		fontSize: 18,
		fontWeight: "bold",
		marginLeft: 10,
	},
	details: {
		marginVertical: 10,
	},
	detailText: {
		fontSize: 16,
		lineHeight: 22,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0", // Themed in component
	},
	payoutLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
	payoutValue: {
		fontSize: 22,
		fontWeight: "bold",
	},
	button: {
		marginTop: 15,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default JobCard;
