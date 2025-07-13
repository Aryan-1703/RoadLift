import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

const SegmentedControl = ({ options, selectedOption, onSelect }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		<View
			style={[
				styles.container,
				{ borderColor: colors.tint, backgroundColor: colors.background },
			]}
		>
			{options.map(option => (
				<TouchableOpacity
					key={option}
					style={[
						styles.segment,
						selectedOption === option && { backgroundColor: colors.tint },
					]}
					onPress={() => onSelect(option)}
				>
					<Text
						style={[
							styles.segmentText,
							{ color: selectedOption === option ? "#fff" : colors.tint },
						]}
					>
						{option}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		borderWidth: 1,
		borderRadius: 8,
		overflow: "hidden",
		width: "100%",
	},
	segment: {
		flex: 1,
		paddingVertical: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentText: {
		fontSize: 16,
		fontWeight: "600",
	},
});

export default SegmentedControl;
