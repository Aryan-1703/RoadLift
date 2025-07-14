import React from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
} from "react-native";
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

const DriverProfileScreen = () => {
	// --- CONTEXTS & THEME ---
	const { user, logout } = useAuth(); // Get user data and logout function from context
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- HANDLER ---
	const handleLogout = async () => {
		// Call the central logout function
		await logout();
		// Navigation is handled automatically by app/index.tsx
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
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

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	headerContainer: {
		padding: 20,
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitle: { fontSize: 22, fontWeight: "bold" },
	profileInfo: { alignItems: "center", marginTop: 40, marginBottom: 40 },
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
