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
import { useLocation } from "../_context/LocationContext";
import getDrivingDistanceInKm from "../utils/getDrivingDistanceInKm";

const DISTANCE_LIMIT_KM = 50;

const DriverDashboardScreen = () => {
	const [jobs, setJobs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const router = useRouter();

	const { theme } = useTheme();
	const { token, user } = useAuth();
	const { socket } = useSocket();
	const { location } = useLocation();

	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	const fetchAvailableJobs = useCallback(async () => {
		try {
			const res = await axios.get(`${API_URL}/driver/jobs/available`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const nearbyJobs = await Promise.all(
				res.data.map(async job => {
					if (!location?.coords || !job.pickupLocation?.coordinates?.length) return null;

					const [pickupLon, pickupLat] = job.pickupLocation.coordinates;

					const distanceKm = await getDrivingDistanceInKm(
						location.coords.latitude,
						location.coords.longitude,
						pickupLat,
						pickupLon
					);
					return distanceKm !== Infinity && distanceKm <= DISTANCE_LIMIT_KM
						? { ...job, distanceKm }
						: null;
				})
			);
			setJobs(nearbyJobs.filter(Boolean));
		} catch (err) {
			console.error("Error fetching jobs:", err);
			Alert.alert("Error", "Could not load jobs. Please try again later.");
		} finally {
			setIsLoading(false);
			setRefreshing(false);
		}
	}, [token, location]);

	useEffect(() => {
		if (!socket || !user || !location?.coords) return;

		socket.emit("join-room", {
			userId: user.id,
			role: user.role,
		});

		const handleNewJob = async newJob => {
			const [pickupLon, pickupLat] = newJob.pickupLocation.coordinates;
			const distanceKm = await getDrivingDistanceInKm(
				location.coords.latitude,
				location.coords.longitude,
				pickupLat,
				pickupLon
			);

			if (distanceKm > DISTANCE_LIMIT_KM || distanceKm === Infinity) return;

			// Add the distance to the job object before setting it
			const jobWithDistance = { ...newJob, distanceKm };

			setJobs(prev => [jobWithDistance, ...prev]);

			Alert.alert(
				"🚨 New Job Available!",
				`A new ${newJob.serviceType} job is available ${distanceKm.toFixed(1)} km away.`
			);
		};

		const handleJobTaken = data => {
			setJobs(prev => prev.filter(job => String(job.id) !== String(data.jobId)));
		};

		socket.on("new-job", handleNewJob);
		socket.on("job-taken", handleJobTaken);

		return () => {
			socket.off("new-job", handleNewJob);
			socket.off("job-taken", handleJobTaken);
		};
	}, [socket, user, location]);

	useFocusEffect(
		useCallback(() => {
			if (location) {
				setIsLoading(true);
				fetchAvailableJobs();
			} else {
				setIsLoading(true);
			}
		}, [location, fetchAvailableJobs])
	);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchAvailableJobs();
	}, [fetchAvailableJobs]);

	const handleAcceptJob = async jobId => {
		try {
			await axios.put(
				`${API_URL}/driver/jobs/${jobId}/accept`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			router.push({ pathname: "/active-job", params: { jobId } });
		} catch (err) {
			Alert.alert(
				"Could Not Accept Job",
				err.response?.data?.message || "This job may have been taken already."
			);
			onRefresh();
		}
	};

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
					<JobCard
						job={item}
						distanceKm={item.distanceKm}
						onAccept={() => handleAcceptJob(item.id)}
					/>
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

const styles = StyleSheet.create({
	container: { flex: 1 },
	listContainer: { paddingVertical: 20 },
	center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	header: { fontSize: 32, fontWeight: "bold", marginHorizontal: 15, marginBottom: 20 },
	emptyText: { fontSize: 18, fontWeight: "600" },
	emptySubtext: { fontSize: 14, marginTop: 8 },
});

export default DriverDashboardScreen;
