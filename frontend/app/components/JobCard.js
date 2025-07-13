import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

const JobCard = ({ job, onAccept }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		<View
			style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
		>
			<Text style={[styles.serviceType, { color: colors.text }]}>
				{job.serviceType.replace("-", " ").toUpperCase()}
			</Text>
			<Text style={[styles.detail, { color: colors.text }]}>
				Customer: {job.User.name}
			</Text>
			<Text style={[styles.detail, { color: colors.text }]}>
				Payout: ${job.estimatedCost.toFixed(2)}
			</Text>
			<TouchableOpacity
				style={[styles.button, { backgroundColor: colors.tint }]}
				onPress={onAccept}
			>
				<Text style={styles.buttonText}>Accept Job</Text>
			</TouchableOpacity>
		</View>
	);
};
// Styles for JobCard...
const styles = StyleSheet.create({
	/* ... styles here ... */
});
export default JobCard;
