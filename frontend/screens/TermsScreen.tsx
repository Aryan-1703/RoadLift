import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";

export const TermsScreen = () => {
	const { colors } = useTheme();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
				<Text style={[styles.paragraph, { color: colors.textMuted }]}>
					Welcome to RoadLift. By using our application, you agree to the following terms
					and conditions.
				</Text>
				<Text style={[styles.paragraph, { color: colors.textMuted }]}>
					1. RoadLift connects customers with independent roadside assistance providers.
				</Text>
				<Text style={[styles.paragraph, { color: colors.textMuted }]}>
					2. All payments are processed securely through our platform.
				</Text>
				<Text style={[styles.paragraph, { color: colors.textMuted }]}>
					3. Providers are responsible for their own vehicles, tools, and safety.
				</Text>
				<Text style={[styles.paragraph, { color: colors.textMuted }]}>
					4. Customers must provide accurate location and vehicle information.
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 24 },
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
	paragraph: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
});
