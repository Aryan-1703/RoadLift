import React from "react";
import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

const LiveTrackingScreen = () => {
	const { jobId } = useLocalSearchParams();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.title}>Help is on the way!</Text>
				<Text>This screen will show the driver&apos;s location on a map.</Text>
				<Text>Job ID: {jobId}</Text>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1, justifyContent: "center", alignItems: "center" },
	title: { fontSize: 24, fontWeight: "bold" },
});

export default LiveTrackingScreen;
