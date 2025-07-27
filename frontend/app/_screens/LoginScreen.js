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
import { useRouter } from "expo-router";
import { useTheme } from "../_context/ThemeContext";
import { useAuth } from "../_context/AuthContext"; // 1. Import the central AuthContext hook
import Colors from "../_constants/Colors";
import { API_URL } from "../config/constants";

const LoginScreen = () => {
	// --- STATE AND HOOKS ---
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	// --- CONTEXTS ---
	const { theme } = useTheme();
	const { login } = useAuth(); // 2. Get the central login function

	// --- THEME ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- API CALL HANDLER ---
	const handleLogin = async () => {
		if (!phoneNumber || !password) {
			Alert.alert("Missing Fields", "Please enter both phone number and password.");
			return;
		}
		setIsLoading(true);

		try {
			let response;
			let roleKey;

			// Attempt to log in as a User first
			try {
				response = await axios.post(`${API_URL}/auth/login/user`, {
					phoneNumber,
					password,
				});
				roleKey = "user";
			} catch (userError) {
				// If that fails with a 401, try as a Driver
				if (userError.response && userError.response.status === 401) {
					response = await axios.post(`${API_URL}/auth/login/driver`, {
						phoneNumber,
						password,
					});
					roleKey = "driver";
				} else {
					throw userError; // It was a different error, so let it fail
				}
			}

			// Prepare the data object for our context
			const loginData = {
				token: response.data.token,
				user: response.data[roleKey],
				role: roleKey,
			};

			// 3. Call the central login function from the context
			// This single call handles setting state, saving to storage, and connecting the socket.
			await login(loginData);

			// Navigation is now handled by app/index.tsx, so we don't need router.replace() here.
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Invalid credentials or server error.";
			Alert.alert("Login Failed", errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER (Your JSX was perfect, no changes needed here) ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.innerContainer}
			>
				<Text style={[styles.title, { color: colors.tint }]}>RoadLift</Text>
				<Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>
					Welcome back! Please sign in.
				</Text>

				{/* Inputs and buttons... */}
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

// Styles were also perfect, no changes needed.
const styles = StyleSheet.create({
	container: { flex: 1 },
	innerContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
	title: { fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
	subtitle: { fontSize: 18, textAlign: "center", marginBottom: 50 },
	inputGroup: { marginBottom: 20, position: "relative" },
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
	eyeButtonText: { fontWeight: "600" },
	button: { padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
	buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
	linkContainer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
	linkText: { fontSize: 16 },
	link: { fontSize: 16, fontWeight: "bold" },
});

export default LoginScreen;
