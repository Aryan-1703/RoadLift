import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

const DriverProfileScreen = () => {
	// --- HOOKS & STATE ---
	const router = useRouter();
	const [user, setUser] = useState(null);
	const { theme } = useTheme(); // We don't need the toggle here, just the current theme
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	useEffect(() => {
		// Load the driver's info from storage to display their name
		const loadUserData = async () => {
			const userDataString = await AsyncStorage.getItem("user");
			if (userDataString) {
				setUser(JSON.parse(userDataString));
			}
		};
		loadUserData();
	}, []);

	// --- HANDLERS ---
	const handleLogout = async () => {
		await AsyncStorage.multiRemove(["token", "user", "role"]);
		// Go back to the very beginning of the app flow
		router.replace("/");
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<View style={styles.headerContainer}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
			</View>

			<View style={styles.profileInfo}>
				<View style={[styles.avatar, { backgroundColor: colors.tint }]}>
					<FontAwesome5 name="user-alt" size={40} color="#fff" />
				</View>
				<Text style={[styles.userName, { color: colors.text }]}>
					{user?.name || "Driver"}
				</Text>
				<Text style={[styles.userPhone, { color: colors.tabIconDefault }]}>
					{user?.phoneNumber}
				</Text>
			</View>

			{/* In the future, we can add more settings rows here like in the customer settings page */}

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerContainer: {
		padding: 20,
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0", // This will be themed
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "bold",
	},
	profileInfo: {
		alignItems: "center",
		marginTop: 40,
		marginBottom: 40,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	userName: {
		fontSize: 24,
		fontWeight: "bold",
	},
	userPhone: {
		fontSize: 16,
		marginTop: 4,
	},
	logoutButton: {
		marginHorizontal: 20,
		backgroundColor: "#ff3b30", // A standard destructive action color
		borderRadius: 12,
		padding: 15,
		alignItems: "center",
		marginTop: "auto", // Pushes the button to the bottom
		marginBottom: 20,
	},
	logoutButtonText: {
		color: "#fff",
		fontSize: 17,
		fontWeight: "600",
	},
});

export default DriverProfileScreen;
