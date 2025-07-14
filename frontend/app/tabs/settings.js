import React from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Switch,
	StatusBar,
} from "react-native";
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";

// A reusable component for each settings row, now fully themed
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

const SettingsScreen = () => {
	// --- CONTEXTS & THEME ---
	const { logout } = useAuth(); // Get the central logout function
	const { theme, toggleTheme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- HANDLER ---
	const handleLogout = async () => {
		// This single function now handles clearing state, storage, and disconnecting the socket
		await logout();
		// Navigation is handled automatically by the app/index.tsx gatekeeper
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<Text style={[styles.headerText, { color: colors.text }]}>Settings</Text>
			</View>

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
				<SettingsRow icon="user-circle" label="Account" colors={colors}>
					<FontAwesome5 name="chevron-right" size={16} color={colors.tabIconDefault} />
				</SettingsRow>
			</View>

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

// --- STYLESHEET (Layout & Themed) ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
	headerText: { fontSize: 32, fontWeight: "bold" },
	settingsGroup: {
		marginTop: 30,
		marginHorizontal: 15,
		borderRadius: 10,
		overflow: "hidden",
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

export default SettingsScreen;
