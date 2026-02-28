import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "../context/ThemeContext";

export const HelpCenterScreen = () => {
	const { colors } = useTheme();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.content}>
				<Text style={[styles.title, { color: colors.text }]}>Help Center</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					If you need assistance, please contact our support team at support@roadlift.com
					or call 1-800-ROADLIFT.
				</Text>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 24, alignItems: "center", justifyContent: "center", flex: 1 },
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
	subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
});
