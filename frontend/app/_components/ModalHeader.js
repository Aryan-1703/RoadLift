import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";

const ModalHeader = ({ title }) => {
	const router = useRouter();
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		<View style={[styles.header, { borderBottomColor: colors.border }]}>
			<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
				<FontAwesome5 name="chevron-left" size={22} color={colors.tint} />
			</TouchableOpacity>
			<Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
	
			<View style={{ width: 40 }} />
		</View>
	);
};

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderBottomWidth: 1,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	backButton: {
		padding: 5,
	},
});

export default ModalHeader;
