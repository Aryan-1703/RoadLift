import React, { useState, useCallback } from "react";
import {
	SafeAreaView,
	FlatList,
	StyleSheet,
	Text,
	View,
	RefreshControl,
	ActivityIndicator,
	StatusBar,
	Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JobCard from "../components/JobCard";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

const API_URL = "http://10.0.0.125:8001/api";

const DriverDashboardScreen = () => {
	// --- HOOKS & STATE ---
	const [jobs, setJobs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const router = useRouter();

	// --- THEME ---
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- DATA FETCHING ---
	const fetchAvailableJobs = useCallback(async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			const response = await axios.get(`${API_URL}/driver/jobs/available`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setJobs(response.data);
		} catch (error) {
			console.error("Failed to fetch jobs:", error.response?.data || error.message);
			Alert.alert("Error", "Could not fetch available jobs.");
		} finally {
			setIsLoading(false);
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			setIsLoading(true);
			fetchAvailableJobs();
		}, [fetchAvailableJobs])
	);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchAvailableJobs();
	}, [fetchAvailableJobs]);

	// --- HANDLERS ---
	const handleAcceptJob = async jobId => {
		try {
			const token = await AsyncStorage.getItem("token");
			await axios.put(
				`${API_URL}/driver/jobs/${jobId}/accept`,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			// On success, navigate to the active job screen
			router.push({
				pathname: "/active-job",
				params: { jobId },
			});
		} catch (error) {
			console.error("Failed to accept job:", error.response?.data || error.message);
			Alert.alert(
				"Could Not Accept Job",
				error.response?.data?.message || "This job may have been taken by another driver."
			);
			onRefresh(); // Refresh the list to remove the taken job
		}
	};

	// --- RENDER ---
	if (isLoading) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.tint} />
			</View>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<FlatList
				data={jobs}
				renderItem={({ item }) => (
					<JobCard job={item} onAccept={() => handleAcceptJob(item.id)} />
				)}
				keyExtractor={item => item.id.toString()}
				ListHeaderComponent={
					<Text style={[styles.header, { color: colors.text }]}>Available Jobs</Text>
				}
				ListEmptyComponent={
					<View style={styles.center}>
						<Text style={[styles.emptyText, { color: colors.text }]}>
							No available jobs right now.
						</Text>
						<Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
							Pull down to refresh.
						</Text>
					</View>
				}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={colors.tint}
					/>
				}
				contentContainerStyle={styles.listContainer}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	listContainer: { paddingVertical: 20 },
	center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	header: { fontSize: 32, fontWeight: "bold", marginHorizontal: 15, marginBottom: 20 },
	emptyText: { fontSize: 18, fontWeight: "600" },
	emptySubtext: { fontSize: 14, marginTop: 8 },
});

export default DriverDashboardScreen;
