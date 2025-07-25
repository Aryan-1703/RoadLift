import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const StarRating = ({ rating, onRatingChange, size = 32, color = "#FFD700" }) => {
	const stars = [1, 2, 3, 4, 5];

	return (
		<View style={styles.container}>
			{stars.map(star => (
				<TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
					<FontAwesome
						name={star <= rating ? "star" : "star-o"}
						size={size}
						color={color}
						style={styles.star}
					/>
				</TouchableOpacity>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	star: {
		marginHorizontal: 8,
	},
});

export default StarRating;
