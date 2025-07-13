import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	StatusBar,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext"; // Import theme hook
import Colors from "../constants/Colors"; // Import color definitions

// Make sure this IP is correct for your local network
const API_URL = "http://10.0.0.125:8001/api";

const RegisterScreen = () => {
	// --- STATE AND HOOKS ---
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	// --- THEME INTEGRATION ---
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- API CALL ---
	const handleRegister = async () => {
		if (!name || !phoneNumber || !password) {
			Alert.alert("Missing Fields", "Please fill in all fields.");
			return;
		}
		setIsLoading(true);

		try {
			const response = await axios.post(`${API_URL}/auth/register/user`, {
				name,
				phoneNumber,
				password,
			});

			await AsyncStorage.setItem("token", response.data.token);
			await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

			// Immediately log them in by navigating to the main app layout
			router.replace("/tabs");
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Registration failed. Please try again.";
			Alert.alert("Registration Failed", errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.innerContainer}
			>
				<Text style={[styles.title, { color: colors.tint }]}>Create Account</Text>
				<Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>
					Let&apos;s get you on the road.
				</Text>

				<View style={styles.inputGroup}>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Full Name"
						placeholderTextColor={colors.tabIconDefault}
						value={name}
						onChangeText={setName}
					/>
				</View>

				<View style={styles.inputGroup}>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Phone Number"
						placeholderTextColor={colors.tabIconDefault}
						keyboardType="phone-pad"
						value={phoneNumber}
						onChangeText={setPhoneNumber}
					/>
				</View>

				<View style={styles.inputGroup}>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Password"
						placeholderTextColor={colors.tabIconDefault}
						secureTextEntry={true}
						value={password}
						onChangeText={setPassword}
					/>
				</View>

				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={handleRegister}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#ffffff" />
					) : (
						<Text style={styles.buttonText}>Create Account</Text>
					)}
				</TouchableOpacity>

				<View style={styles.linkContainer}>
					<Text style={[styles.linkText, { color: colors.text, opacity: 0.7 }]}>
						Already have an account?{" "}
					</Text>
					<TouchableOpacity onPress={() => router.back()}>
						<Text style={[styles.link, { color: colors.tint }]}>Sign In</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// --- STYLESHEET ---
// Contains only layout and non-color styles.
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	innerContainer: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 40,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 10,
	},
	subtitle: {
		fontSize: 18,
		textAlign: "center",
		marginBottom: 50,
	},
	inputGroup: {
		marginBottom: 20,
	},
	input: {
		padding: 18,
		borderRadius: 12,
		borderWidth: 1,
		fontSize: 16,
	},
	button: {
		padding: 18,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	buttonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "bold",
	},
	linkContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 30,
	},
	linkText: {
		fontSize: 16,
	},
	link: {
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default RegisterScreen;
