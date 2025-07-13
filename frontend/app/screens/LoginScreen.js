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
import { useTheme } from "../context/ThemeContext"; // Ensure this path is correct
import Colors from "../constants/Colors"; // Ensure this path is correct

// Make sure this IP is correct for your local network
const API_URL = "http://10.0.0.125:8001/api";

const LoginScreen = () => {
	// --- STATE AND HOOKS ---
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- API CALL ---
	const handleLogin = async () => {
		if (!phoneNumber || !password) {
			Alert.alert("Missing Fields", "Please enter both phone number and password.");
			return;
		}
		setIsLoading(true);

		try {
			// --- NEW: Unified Login Attempt ---
			try {
				// Attempt 1: Log in as a User
				const response = await axios.post(`${API_URL}/auth/login/user`, {
					phoneNumber,
					password,
				});

				await AsyncStorage.setItem("token", response.data.token);
				await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
				await AsyncStorage.setItem("role", "customer");
				router.replace("/tabs");
			} catch (userError) {
				// If user login fails, try logging in as a Driver
				if (userError.response && userError.response.status === 401) {
					const response = await axios.post(`${API_URL}/auth/login/driver`, {
						phoneNumber,
						password,
					});

					await AsyncStorage.setItem("token", response.data.token);
					await AsyncStorage.setItem("user", JSON.stringify(response.data.driver));
					await AsyncStorage.setItem("role", "driver");
					// TODO: Create and navigate to the driver dashboard
					router.replace("/driver-tabs");
					alert("Driver login successful!");
				} else {
					// It was a different error (e.g., server down), so throw it
					throw userError;
				}
			}
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Invalid credentials or server error.";
			Alert.alert("Login Failed", errorMessage);
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
				<Text style={[styles.title, { color: colors.tint }]}>TowLink</Text>
				<Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>
					Welcome back! Please sign in.
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
						secureTextEntry={!isPasswordVisible}
						value={password}
						onChangeText={setPassword}
					/>
					<TouchableOpacity
						style={styles.eyeButton}
						onPress={() => setIsPasswordVisible(!isPasswordVisible)}
					>
						<Text style={[styles.eyeButtonText, { color: colors.tint }]}>
							{isPasswordVisible ? "Hide" : "Show"}
						</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={handleLogin}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#ffffff" />
					) : (
						<Text style={styles.buttonText}>Sign In</Text>
					)}
				</TouchableOpacity>

				<View style={styles.linkContainer}>
					<Text style={[styles.linkText, { color: colors.text, opacity: 0.7 }]}>
						Don&apos;t have an account?{" "}
					</Text>
					<TouchableOpacity onPress={() => router.push("/register")}>
						<Text style={[styles.link, { color: colors.tint }]}>Register</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

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
		fontSize: 48,
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
		position: "relative",
	},
	input: {
		padding: 18,
		borderRadius: 12,
		borderWidth: 1,
		fontSize: 16,
		paddingRight: 60,
	},
	eyeButton: {
		position: "absolute",
		right: 0,
		top: 0,
		height: "100%",
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	eyeButtonText: {
		fontWeight: "600",
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

export default LoginScreen;
