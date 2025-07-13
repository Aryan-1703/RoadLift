import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // A great icon set

const ServiceCard = ({ iconName, name, price, onPress, disabled = false }) => {
	return (
		<TouchableOpacity
			style={[styles.card, disabled && styles.disabledCard]}
			onPress={onPress}
			disabled={disabled}
		>
			<MaterialCommunityIcons
				name={iconName}
				size={40}
				color={disabled ? "#999" : "#007aff"}
			/>
			<Text style={[styles.name, disabled && styles.disabledText]}>{name}</Text>
			<Text style={[styles.price, disabled && styles.disabledText]}>{price}</Text>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 20,
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		margin: 8,
		// iOS shadow
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		// Android shadow
		elevation: 3,
	},
	disabledCard: {
		backgroundColor: "#f8f8f8",
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
		color: "#6c757d",
	},
	disabledText: {
		color: "#999",
	},
});

export default ServiceCard;
