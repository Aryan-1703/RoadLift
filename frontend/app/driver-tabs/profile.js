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

// Reusable component for settings rows, just like in the customer's settings
const SettingsRow = ({ icon, label, children, colors }) => (
	<View style={[styles.row, { borderBottomColor: colors.border }]}>
		<View style={styles.labelContainer}>
			<FontAwesome5
				name={icon}
				size={20}
				color={colors.tabIconDefault}
				style={styles.icon}
			/>
			<Text style={[styles.labelText, { color: colors.text }]}>{label}</Text>
		</View>
		<View>{children}</View>
	</View>
);

const DriverProfileScreen = () => {
	// --- CONTEXTS & THEME ---
	const { user, token, logout, login } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	const isActive = user?.isActive || false;

	// --- HANDLERS ---
	const handleLogout = async () => {
		await logout();
	};

	const handleStatusChange = async newStatus => {
		try {
			const updatedUser = { ...user, isActive: newStatus };
			await login({ token, user: updatedUser, role: "driver" }, false); // Pass false to prevent navigation

			await axios.put(
				`${API_URL}/driver/status`,
				{ isActive: newStatus },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
		} catch (error) {
			console.error("Failed to update status:", error);
			Alert.alert("Error", "Could not update your status. Please try again.");
			// Revert the UI on failure
			await login({ token, user, role: "driver" }, false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Profile & Settings
				</Text>
			</View>

			{/* --- PROFILE INFO --- */}
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
			{/* --- STATUS TOGGLE SECTION (NOW THEMED) --- */}
			<View
				style={[
					styles.statusContainer,
					{ backgroundColor: colors.card, borderColor: colors.border },
				]}
			>
				<View
					style={[
						styles.statusIndicator,
						{ backgroundColor: isActive ? "#34c759" : colors.danger },
					]}
				/>
				<Text style={[styles.statusText, { color: colors.text }]}>
					You are currently {isActive ? "Online" : "Offline"}
				</Text>
				<Switch
					trackColor={{ false: "#767577", true: colors.tint }}
					thumbColor={isDarkMode ? colors.tint : "#f4f3f4"}
					ios_backgroundColor="#3e3e3e"
					onValueChange={handleStatusChange}
					value={isActive}
				/>
			</View>

			{/* --- NEW SETTINGS SECTION --- */}
			<View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
				<SettingsRow icon="moon" label="Dark Mode" colors={colors}>
					<Switch
						trackColor={{ false: "#767577", true: colors.tint }}
						thumbColor={isDarkMode ? colors.tint : "#f4f3f4"}
						ios_backgroundColor="#3e3e3e"
						onValueChange={toggleTheme}
						value={isDarkMode}
					/>
				</SettingsRow>
			</View>

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// We need to slightly update the AuthContext to handle the optimistic UI
// In _context/AuthContext.js, modify the 'login' function:
/*
const login = async (loginData, shouldNavigate = true) => {
    // ... (set state and AsyncStorage)
    connectSocket(newUser.id, newRole);
    if (shouldNavigate) {
        // ... (router.replace logic)
    }
};
*/

// --- STYLESHEET (with updates) ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	headerContainer: {
		padding: 20,
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitle: { fontSize: 22, fontWeight: "bold" },
	statusContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 20,
		margin: 15,
		borderRadius: 12,
		borderWidth: 1,
	},
	statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
	statusText: { flex: 1, fontSize: 18, fontWeight: "600" },
	profileInfo: { alignItems: "center", marginTop: 20, marginBottom: 20 },
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
	settingsGroup: {
		marginHorizontal: 15,
		borderRadius: 10,
		overflow: "hidden",
		marginBottom: 20,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 18,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	labelContainer: { flexDirection: "row", alignItems: "center" },
	icon: { marginRight: 15, width: 22 },
	labelText: { fontSize: 17 },
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
