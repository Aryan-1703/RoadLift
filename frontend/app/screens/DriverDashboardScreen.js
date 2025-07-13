import React, { useState, useCallback } from "react";
import {
	SafeAreaView,
	FlatList,
	StyleSheet,
	Text,
	View,
	RefreshControl,
	ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JobCard from "../components/JobCard";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

const API_URL = "http://YOUR_COMPUTER_IP_ADDRESS:8001/api";

const DriverDashboardScreen = () => {
	const [jobs, setJobs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const { theme } = useTheme();
	const colors = Colors[theme];

	const fetchAvailableJobs = async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			const response = await axios.get(`${API_URL}/driver/jobs/available`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setJobs(response.data);
		} catch (error) {
			console.error("Failed to fetch jobs:", error.response?.data || error);
		} finally {
			setIsLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			setIsLoading(true);
			fetchAvailableJobs();
		}, [])
	);

	const onRefresh = () => {
		setRefreshing(true);
		fetchAvailableJobs();
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
			<FlatList
				data={jobs}
				renderItem={({ item }) => (
					<JobCard job={item} onAccept={() => alert(`Accept job ${item.id}`)} />
				)}
				keyExtractor={item => item.id.toString()}
				ListHeaderComponent={
					<Text style={[styles.header, { color: colors.text }]}>Available Jobs</Text>
				}
				ListEmptyComponent={
					<Text style={[styles.emptyText, { color: colors.text }]}>
						No available jobs right now. Pull down to refresh.
					</Text>
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

// Styles for DriverDashboardScreen...
const styles = StyleSheet.create({
	/* ... styles here ... */
});
export default DriverDashboardScreen;
