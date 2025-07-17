import React, { useState, useCallback, useEffect } from "react";
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
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import { useSocket } from "../_context/SocketContext";
import JobCard from "../_components/JobCard";
import Colors from "../_constants/Colors";
import { API_URL } from "../config/constants";

const DriverDashboardScreen = () => {
	// --- HOOKS & STATE ---
	const [jobs, setJobs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const router = useRouter();

	// --- CONTEXTS ---
	const { theme } = useTheme();
	const { token, user } = useAuth(); // Get token from AuthContext
	const { socket } = useSocket();

	// --- THEME ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	useEffect(() => {
		if (!socket || !user) return;
		// Join proper socket room
		socket.emit("join-room", {
			userId: user.id,
			role: user.role,
		});
		console.log("🔗 Emitted join-room with user:", user.id, user.role);

		const handleNewJob = newJob => {
			console.log("📦 Received 'new-job':", newJob);
			setJobs(prevJobs => [newJob, ...prevJobs]);
			Alert.alert(
				"New Job Available!",
				`A new ${newJob.serviceType} request has been posted.`
			);
		};

		const handleJobTaken = data => {
			console.log(`❌ Job ${data.jobId} taken, removing from list`);
			setJobs(prevJobs => prevJobs.filter(job => String(job.id) !== String(data.jobId)));
		};

		socket.on("new-job", handleNewJob);
		socket.on("job-taken", handleJobTaken);

		return () => {
			socket.off("new-job", handleNewJob);
			socket.off("job-taken", handleJobTaken);
		};
	}, [socket, user]);

	// --- DATA FETCHING ---
	const fetchAvailableJobs = useCallback(async () => {
		if (!token) return;
		try {
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
	}, [token]);

	// useFocusEffect will re-fetch data every time the driver comes back to this screen
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
			await axios.put(
				`${API_URL}/driver/jobs/${jobId}/accept`,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			router.push({ pathname: "/active-job", params: { jobId } });
		} catch (error) {
			console.error("Failed to accept job:", error.response?.data || error.message);
			Alert.alert(
				"Could Not Accept Job",
				error.response?.data?.message || "This job may have been taken by another driver."
			);
			onRefresh();
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
							Pull down to refresh or wait for new jobs.
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

// --- STYLES ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	listContainer: { paddingVertical: 20 },
	center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	header: { fontSize: 32, fontWeight: "bold", marginHorizontal: 15, marginBottom: 20 },
	emptyText: { fontSize: 18, fontWeight: "600" },
	emptySubtext: { fontSize: 14, marginTop: 8 },
});

export default DriverDashboardScreen;
