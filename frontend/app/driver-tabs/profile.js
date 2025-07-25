import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
	Switch,
	Alert,
	Linking,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import { API_URL } from "../config/constants";

// Reusable component for settings rows
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

	const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
	const isActive = user?.isActive || false;
	const payoutsEnabled = user?.stripePayoutsEnabled || false;

	// --- HANDLERS ---
	const handleLogout = async () => {
		await logout();
	};

	const handleStatusChange = async newStatus => {
		try {
			const updatedUser = { ...user, isActive: newStatus };
			await login({ token, user: updatedUser, role: "driver" }, false); // Optimistic UI update

			await axios.put(
				`${API_URL}/driver/status`,
				{ isActive: newStatus },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
		} catch (error) {
			console.error("Failed to update status:", error);
			Alert.alert("Error", "Could not update your status. Please try again.");
			await login({ token, user, role: "driver" }, false); // Revert UI
		}
	};

	const handleSetupPayouts = async () => {
		setIsLoadingOnboarding(true);
		try {
			const response = await axios.post(
				`${API_URL}/driver/stripe-onboarding`,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			const { url } = response.data;
			if (url) {
				await Linking.openURL(url);
			} else {
				Alert.alert("Error", "Could not get onboarding link.");
			}
		} catch (error) {
			console.error("Failed to start Stripe onboarding:", error);
			Alert.alert("Error", "An error occurred while setting up payouts.");
		} finally {
			setIsLoadingOnboarding(false);
		}
	};

	// --- RENDER ---
	const renderPayoutsSection = () => {
		if (payoutsEnabled) {
			return (
				<View
					style={[
						styles.payoutsContainer,
						{ backgroundColor: "#4CD964", borderColor: "#34c759" },
					]}
				>
					<FontAwesome5 name="check-circle" size={24} color="#fff" />
					<View style={styles.payoutsTextContainer}>
						<Text style={[styles.payoutsTitle, { color: "#fff" }]}>Payouts Active</Text>
						<Text style={[styles.payoutsSubtitle, { color: "rgba(255,255,255,0.9)" }]}>
							You are ready to receive payments.
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View
				style={[
					styles.payoutsContainer,
					{ backgroundColor: colors.card, borderColor: colors.border },
				]}
			>
				<FontAwesome5 name="stripe-s" size={32} color="#6772E5" />
				<View style={styles.payoutsTextContainer}>
					<Text style={[styles.payoutsTitle, { color: colors.text }]}>Setup Payouts</Text>
					<Text style={[styles.payoutsSubtitle, { color: colors.tabIconDefault }]}>
						Connect with Stripe to receive payments.
					</Text>
				</View>
				<TouchableOpacity
					style={[styles.setupButton, { backgroundColor: colors.tint }]}
					onPress={handleSetupPayouts}
					disabled={isLoadingOnboarding}
				>
					{isLoadingOnboarding ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.setupButtonText}>Setup</Text>
					)}
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ScrollView>
				<View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Profile & Settings
					</Text>
				</View>

				{/* PROFILE INFO */}
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

				{/* STATUS & PAYOUTS */}
				<View style={[styles.section, { backgroundColor: colors.card }]}>
					<SettingsRow
						icon="toggle-on"
						label={`Status: ${isActive ? "Online" : "Offline"}`}
						colors={colors}
					>
						<Switch
							trackColor={{ false: "#767577", true: colors.tint }}
							thumbColor={"#fff"}
							ios_backgroundColor="#3e3e3e"
							onValueChange={handleStatusChange}
							value={isActive}
						/>
					</SettingsRow>
					{renderPayoutsSection()}
				</View>

				{/* APP SETTINGS */}
				<View style={[styles.section, { backgroundColor: colors.card }]}>
					<SettingsRow icon="moon" label="Dark Mode" colors={colors}>
						<Switch
							trackColor={{ false: "#767577", true: colors.tint }}
							thumbColor={"#fff"}
							ios_backgroundColor="#3e3e3e"
							onValueChange={toggleTheme}
							value={isDarkMode}
						/>
					</SettingsRow>
				</View>

				<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
					<Text style={styles.logoutButtonText}>Logout</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
};

// --- STYLES ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	headerContainer: {
		padding: 20,
		alignItems: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitle: { fontSize: 22, fontWeight: "bold" },
	profileInfo: { alignItems: "center", paddingVertical: 30 },
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
	section: {
		marginHorizontal: 15,
		borderRadius: 12,
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
	payoutsContainer: { flexDirection: "row", alignItems: "center", padding: 18 },
	payoutsTextContainer: { flex: 1, marginHorizontal: 15 },
	payoutsTitle: { fontSize: 17, fontWeight: "bold" },
	payoutsSubtitle: { fontSize: 14, marginTop: 2 },
	setupButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
	setupButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
	logoutButton: {
		margin: 20,
		backgroundColor: "#ff3b30",
		borderRadius: 12,
		padding: 15,
		alignItems: "center",
	},
	logoutButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});

export default DriverProfileScreen;
