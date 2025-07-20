import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ActivityIndicator,
	TouchableOpacity,
	Alert,
	StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../_context/SocketContext";
import { useAuth } from "../_context/AuthContext";

import { API_URL } from "../config/constants";

const FindingDriverScreen = () => {
	// --- HOOKS & STATE ---
	const { jobId } = useLocalSearchParams();
	const router = useRouter();
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];
	const { user } = useAuth();

	const { socket } = useSocket();
	useEffect(() => {
		if (socket && jobId) {
			socket.emit("join-room", {
				userId: user.id,
				role: user.role,
			});

			const handleDirectAccept = data => {
				if (String(data.jobId) === String(jobId)) {
					Alert.alert("DIRECT: Driver Found!", data.message);
					router.replace({
						pathname: "/live-tracking",
						params: { jobId: data.jobId },
					});
				}
			};

			socket.on("job-accepted", handleDirectAccept);

			return () => {
				socket.off("job-accepted", handleDirectAccept);
			};
		} else {
			console.log(
				`...Waiting for connection. Socket exists: ${!!socket}, jobId: ${jobId}`
			);
		}
	}, [socket, jobId]);

	// --- HANDLERS ---
	const handleCancelRequest = () => {
		Alert.alert(
			"Cancel Request",
			"Are you sure you want to cancel this service request?",
			[
				{ text: "Don't Cancel", style: "cancel" },
				{
					text: "Yes, Cancel",
					onPress: async () => {
						try {
							const token = await AsyncStorage.getItem("token");
							await axios.put(
								`${API_URL}/jobs/${jobId}/cancel`,
								{},
								{
									headers: { Authorization: `Bearer ${token}` },
								}
							);
							// On success, go back to the main dashboard
							router.replace("/tabs");
						} catch (error) {
							console.error("Failed to cancel job:", error.response?.data);
							Alert.alert(
								"Error",
								error.response?.data?.message || "Could not cancel the request."
							);
						}
					},
					style: "destructive",
				},
			]
		);
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.tint }]}>
			<StatusBar barStyle="light-content" />
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

			{/* --- CANCEL BUTTON --- */}
			<TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
				<Text style={styles.cancelButtonText}>Cancel Request</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// --- STYLESHEET ---
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
		zIndex: -1, // Make sure it's behind the text
	},
	cancelButton: {
		backgroundColor: "rgba(0, 0, 0, 0.2)",
		margin: 20,
		padding: 15,
		borderRadius: 12,
		alignItems: "center",
	},
	cancelButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "600",
	},
});

export default FindingDriverScreen;
