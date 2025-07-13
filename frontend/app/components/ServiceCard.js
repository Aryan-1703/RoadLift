import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors"; 

const ServiceCard = ({ iconName, name, price, onPress, disabled = false }) => {
	// --- THEME INTEGRATION ---
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		<TouchableOpacity
			style={[
				styles.card,
				{ backgroundColor: colors.card, shadowColor: "#000" },
				disabled && { backgroundColor: colors.background, elevation: 0 },
			]}
			onPress={onPress}
			disabled={disabled}
		>
			<MaterialCommunityIcons
				name={iconName}
				size={40}
				color={disabled ? colors.tabIconDefault : colors.tint}
			/>
			<Text
				style={[
					styles.name,
					{ color: colors.text },
					disabled && { color: colors.tabIconDefault },
				]}
			>
				{name}
			</Text>
			<Text style={[styles.price, { color: colors.tabIconDefault }]}>{price}</Text>
		</TouchableOpacity>
	);
};

// --- STYLESHEET (Layout Only) ---
const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 20,
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		margin: 8,
		// iOS shadow
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		// Android shadow
		elevation: 3,
	},
	name: {
		marginTop: 12,
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
	price: {
		marginTop: 4,
		fontSize: 14,
	},
});

export default ServiceCard;
