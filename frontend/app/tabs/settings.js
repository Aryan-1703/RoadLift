import React from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Switch,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext"; // Import our theme hook
import { FontAwesome5 } from "@expo/vector-icons"; // For icons

// A reusable component for each settings row
const SettingsRow = ({ icon, label, children }) => (
	<View style={styles.row}>
		<View style={styles.labelContainer}>
			<FontAwesome5 name={icon} size={20} color="#6c757d" style={styles.icon} />
			<Text style={styles.labelText}>{label}</Text>
		</View>
		<View>{children}</View>
	</View>
);

const SettingsScreen = () => {
	const router = useRouter();
	const { theme, toggleTheme } = useTheme(); // Use our theme context
	const isDarkMode = theme === "dark";

	const handleLogout = async () => {
		await AsyncStorage.multiRemove(["token", "user"]);
		router.replace("/"); // Go back to the initial loading/gatekeeper screen
	};

	return (
		<SafeAreaView style={isDarkMode ? styles.containerDark : styles.containerLight}>
			<View style={styles.header}>
				<Text style={isDarkMode ? styles.headerTextDark : styles.headerTextLight}>
					Settings
				</Text>
			</View>

			<View style={styles.settingsGroup}>
				<SettingsRow icon="moon" label="Dark Mode">
					<Switch
						trackColor={{ false: "#767577", true: "#81b0ff" }}
						thumbColor={isDarkMode ? "#007aff" : "#f4f3f4"}
						ios_backgroundColor="#3e3e3e"
						onValueChange={toggleTheme}
						value={isDarkMode}
					/>
				</SettingsRow>
				{/* We can add more settings rows here in the future */}
				<SettingsRow icon="user-circle" label="Account">
					{/* Placeholder for account screen navigation */}
					<FontAwesome5 name="chevron-right" size={16} color="#6c757d" />
				</SettingsRow>
			</View>

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutButtonText}>Logout</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	containerLight: {
		flex: 1,
		backgroundColor: "#f0f2f5",
	},
	containerDark: {
		flex: 1,
		backgroundColor: "#000",
	},
	header: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	headerTextLight: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#1c1c1e",
	},
	headerTextDark: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#fff",
	},
	settingsGroup: {
		marginTop: 30,
		marginHorizontal: 15,
		backgroundColor: "#fff", // This will change with theme later
		borderRadius: 10,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	labelContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	icon: {
		marginRight: 15,
	},
	labelText: {
		fontSize: 17,
	},
	logoutButton: {
		marginTop: 40,
		marginHorizontal: 15,
		backgroundColor: "#ff3b30",
		borderRadius: 10,
		padding: 15,
		alignItems: "center",
	},
	logoutButtonText: {
		color: "#fff",
		fontSize: 17,
		fontWeight: "600",
	},
});

export default SettingsScreen;
