import React, { useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const FindingDriverScreen = () => {
	const { jobId } = useLocalSearchParams();
	const { theme } = useTheme();
	const colors = Colors[theme];

	// This is where we will set up our WebSocket listener in the future
	useEffect(() => {
		console.log(`Now listening for updates on Job ID: ${jobId}`);

		// Simulate a driver being found after a few seconds for demo purposes
		const timeout = setTimeout(() => {
			console.log("Simulating driver found!");
			// In the future: navigate to the live tracking map
		}, 8000); // 8 seconds

		// Cleanup function
		return () => clearTimeout(timeout);
	}, [jobId]);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.tint }]}>
			<View style={styles.content}>
				<ActivityIndicator size="large" color="#ffffff" />
				<Text style={styles.title}>Contacting Nearby Drivers</Text>
				<Text style={styles.subtitle}>
					Hang tight, we&apos;re finding the best professional for you.
				</Text>
				<MaterialCommunityIcons
					name="satellite-uplink"
					size={100}
					color="rgba(255, 255, 255, 0.2)"
					style={styles.icon}
				/>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#ffffff",
		textAlign: "center",
		marginTop: 20,
	},
	subtitle: {
		fontSize: 16,
		color: "rgba(255, 255, 255, 0.8)",
		textAlign: "center",
		marginTop: 8,
	},
	icon: {
		position: "absolute",
		bottom: 40,
		opacity: 0.5,
	},
});

export default FindingDriverScreen;
