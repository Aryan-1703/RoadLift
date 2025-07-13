import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ServiceCard from "../components/ServiceCard"; 

const DashboardScreen = () => {
	const [user, setUser] = useState(null);
	const router = useRouter();

	useEffect(() => {
		// Fetch user data from storage when the screen loads
		const loadUserData = async () => {
			const userDataString = await AsyncStorage.getItem("user");
			if (userDataString) {
				setUser(JSON.parse(userDataString));
			}
		};
		loadUserData();
	}, []);

	const handleServiceSelection = serviceName => {
		Alert.alert("Service Selected", `You selected ${serviceName}`);
		// Later: This will navigate to a location confirmation page
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.header}>
					<Text style={styles.welcomeTitle}>Welcome,</Text>
					<Text style={styles.userName}>{user?.name || "User"}</Text>
					<Text style={styles.subtitle}>How can we help you today?</Text>
				</View>

				<View style={styles.serviceGrid}>
					<ServiceCard
						iconName="car-battery"
						name="Battery Boost"
						price="$59"
						onPress={() => handleServiceSelection("Battery Boost")}
					/>
					<ServiceCard
						iconName="key-variant"
						name="Car Lockout"
						price="$79"
						onPress={() => handleServiceSelection("Car Lockout")}
					/>
				</View>
				<View style={styles.serviceGrid}>
					<ServiceCard
						iconName="tire"
						name="Tire Change"
						price="$69"
						onPress={() => handleServiceSelection("Tire Change")}
					/>
					<ServiceCard
						iconName="tow-truck"
						name="Towing"
						price="From $99"
						onPress={() => handleServiceSelection("Towing")}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f2f5",
	},
	scrollContainer: {
		padding: 20,
	},
	header: {
		marginBottom: 30,
	},
	welcomeTitle: {
		fontSize: 24,
		color: "#6c757d",
	},
	userName: {
		fontSize: 36,
		fontWeight: "bold",
		color: "#1c1c1e",
	},
	subtitle: {
		fontSize: 18,
		color: "#6c757d",
		marginTop: 8,
	},
	serviceGrid: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 16,
	},
});

export default DashboardScreen;
