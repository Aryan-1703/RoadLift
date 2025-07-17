import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	Alert,
	TouchableOpacity,
	Linking,
	StatusBar,
	Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import ModalHeader from "../_components/ModalHeader";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";
import { API_URL } from "../config/constants";
import fetchWithAuth from "../services/fetchWithAuth";

// A helper function to format service types for display
const formatServiceType = type => {
	if (!type) return "Service";
	return type.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
};

const ActiveJobScreen = () => {
	const { jobId } = useLocalSearchParams();
	const [job, setJob] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	useEffect(() => {
		const fetchJobDetails = async () => {
			if (!jobId) return;

			try {
				const response = await fetchWithAuth(`${API_URL}/jobs/${jobId}`);
				if (response) {
					const data = await response.json();
					setJob(data);
				} else {
					console.warn("No response received. Possibly unauthorized.");
				}
			} catch (error) {
				console.error("Failed to fetch job details:", error);
				Alert.alert("Error", "Could not load job details.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchJobDetails();
	}, [jobId]);

	const openDirections = () => {
		const { coordinates } = job.pickupLocation;
		const lat = coordinates[1];
		const lon = coordinates[0];
		const url = Platform.select({
			ios: `maps:?daddr=${lat},${lon}`,
			android: `geo:0,0?q=${lat},${lon}(Customer)`,
		});
		Linking.openURL(url);
	};
	const handleCompleteJob = () => {
		Alert.alert("Complete Job", "Are you sure you have completed this service?", [
			{ text: "Not Yet", style: "cancel" },
			{
				text: "Yes, Job is Done",
				onPress: async () => {
					try {
						const token = await AsyncStorage.getItem("token");
						await axios.put(
							`${API_URL}/driver/jobs/${jobId}/complete`,
							{},
							{
								headers: { Authorization: `Bearer ${token}` },
							}
						);
						Alert.alert("Success", "Job marked as complete!");

						router.back();
					} catch (error) {
						console.error("Failed to complete job:", error.response?.data);
						Alert.alert("Error", "Could not complete the job. Please try again.");
					}
				},
				style: "default",
			},
		]);
	};
	if (isLoading) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.tint} />
			</View>
		);
	}

	if (!job) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<ModalHeader title="Error" />
				<View style={styles.center}>
					<Text style={{ color: colors.text, fontSize: 18 }}>Job details not found.</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Active Job" />
			<MapView
				style={styles.map}
				provider={PROVIDER_GOOGLE}
				initialRegion={{
					latitude: job.pickupLocation.coordinates[1],
					longitude: job.pickupLocation.coordinates[0],
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				}}
			>
				<Marker
					coordinate={{
						latitude: job.pickupLocation.coordinates[1],
						longitude: job.pickupLocation.coordinates[0],
					}}
					title="Customer Location"
				/>
			</MapView>
			<View
				style={[
					styles.detailsContainer,
					{ backgroundColor: colors.card, borderTopColor: colors.border },
				]}
			>
				<Text style={[styles.serviceType, { color: colors.text }]}>
					{formatServiceType(job.serviceType)}
				</Text>
				<Text style={[styles.detailText, { color: colors.text }]}>
					Customer: {job.User.name}
				</Text>
				{job.notes && (
					<Text style={[styles.detailText, { color: colors.text, fontStyle: "italic" }]}>
						Notes: &quot;{job.notes}&quot;
					</Text>
				)}
				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={openDirections}
				>
					<FontAwesome5 name="directions" size={20} color="#fff" />
					<Text style={styles.buttonText}>Get Directions</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.button, { backgroundColor: "#34c759", marginTop: 10 }]}
					onPress={handleCompleteJob}
				>
					<FontAwesome5 name="check-circle" size={20} color="#fff" />
					<Text style={styles.buttonText}>Mark as Complete</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	map: { flex: 1 },
	detailsContainer: { padding: 20, borderTopWidth: 1 },
	serviceType: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
	detailText: { fontSize: 16, marginBottom: 10, lineHeight: 22 },
	button: {
		flexDirection: "row",
		padding: 15,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold", marginLeft: 10 },
});

export default ActiveJobScreen;
