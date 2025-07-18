import React from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
	Switch,
	Alert,
} from "react-native";
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import { API_URL } from "../config/constants";

const DriverProfileScreen = () => {
	// --- CONTEXTS & THEME ---
	// We now need the login function to update the user object in our global state
	const { user, token, logout, login } = useAuth();
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// Determine the driver's current status from the user object
	const isActive = user?.isActive || false;

	// --- HANDLERS ---
	const handleLogout = async () => {
		await logout();
	};

	const handleStatusChange = async newStatus => {
		try {
			const response = await axios.put(
				`${API_URL}/driver/status`,
				{ isActive: newStatus },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			await login({ token, user: response.data, role: "driver" });
		} catch (error) {
			console.error("Failed to update status:", error);
			Alert.alert("Error", "Could not update your status. Please try again.");
		}
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Profile & Status</Text>
			</View>

			{/* --- NEW STATUS TOGGLE SECTION --- */}
			<View style={styles.statusContainer}>
				<View
					style={[
						styles.statusIndicator,
						{ backgroundColor: isActive ? "#34c759" : "#ff3b30" },
					]}
				/>
				<Text style={[styles.statusText, { color: colors.text }]}>
					You are currently {isActive ? "Online" : "Offline"}
				</Text>
				<Switch
					trackColor={{ false: "#767577", true: colors.tint }}
					thumbColor={isDarkMode ? colors.tint : "#f4f3f4"}
					onValueChange={handleStatusChange}
					value={isActive}
				/>
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

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// --- STYLESHEET (with new styles) ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	headerContainer: {
		padding: 20,
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitle: { fontSize: 22, fontWeight: "bold" },
	// --- NEW STYLES ---
	statusContainer: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		margin: 15,
		borderRadius: 12,
		backgroundColor: "#f8f9fa", // A light neutral color
		borderWidth: 1,
		borderColor: "#e9ecef",
	},
	statusIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 15,
	},
	statusText: {
		flex: 1,
		fontSize: 18,
		fontWeight: "600",
	},
	// ---
	profileInfo: { alignItems: "center", marginTop: 20, marginBottom: 40 },
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	userName: { fontSize: 24, fontWeight: "bold" },
	userPhone: { fontSize: 16, marginTop: 4 },
	logoutButton: {
		marginHorizontal: 20,
		backgroundColor: "#ff3b30",
		borderRadius: 12,
		padding: 15,
		alignItems: "center",
		marginTop: "auto",
		marginBottom: 20,
	},
	logoutButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});

export default DriverProfileScreen;
