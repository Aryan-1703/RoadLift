import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	Alert,
	StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ServiceCard from "../components/ServiceCard";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

const DashboardScreen = () => {
	// --- STATE AND HOOKS ---
	const [user, setUser] = useState(null);
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	useEffect(() => {
		const loadUserData = async () => {
			const userDataString = await AsyncStorage.getItem("user");
			if (userDataString) {
				setUser(JSON.parse(userDataString));
			}
		};
		loadUserData();
	}, []);

	// --- HANDLERS ---
	const handleServiceSelection = serviceName => {
		Alert.alert("Service Selected", `You selected ${serviceName}`);
		// Next step: Navigate to a location confirmation page
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.header}>
					<Text style={[styles.welcomeTitle, { color: colors.tabIconDefault }]}>
						Welcome,
					</Text>
					<Text style={[styles.userName, { color: colors.text }]}>
						{user?.name || "User"}
					</Text>
					<Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
						How can we help you today?
					</Text>
				</View>

				{/* The ServiceCard components will now be themed automatically */}
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

// --- STYLESHEET (Layout Only) ---
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContainer: {
		padding: 20,
		paddingTop: 40, // More space at the top
	},
	header: {
		marginBottom: 30,
	},
	welcomeTitle: {
		fontSize: 24,
	},
	userName: {
		fontSize: 36,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 18,
		marginTop: 8,
	},
	serviceGrid: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 16,
	},
});

export default DashboardScreen;
