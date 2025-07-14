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
import { useAuth } from "../_context/AuthContext"; // 1. Import the AuthContext hook
import SegmentedControl from "../_components/SegmentedControl";
import Colors from "../_constants/Colors";
import { API_URL } from "../config/constants";

const RegisterScreen = () => {
	// --- STATE AND HOOKS ---
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [role, setRole] = useState("Customer"); // UI state for the toggle
	const router = useRouter();

	// --- CONTEXTS ---
	const { theme } = useTheme();
	const { login } = useAuth(); 

	// --- THEME ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- API CALL HANDLER ---
	const handleRegister = async () => {
		if (!name || !phoneNumber || !password) {
			Alert.alert("Missing Fields", "Please fill in all fields.");
			return;
		}
		setIsLoading(true);

		const endpoint = role === "Customer" ? "user" : "driver";
		const apiUrl = `${API_URL}/auth/register/${endpoint}`;

		try {
			const response = await axios.post(apiUrl, {
				name,
				phoneNumber,
				password,
			});

			const roleKey = role === "Customer" ? "user" : "driver";
			const userOrDriverData = response.data[roleKey];

			if (!userOrDriverData) {
				throw new Error("Invalid response structure from server.");
			}

			// 3. Call the central login function with all the data from the successful registration
			await login({
				token: response.data.token,
				user: userOrDriverData,
				role: roleKey,
			});

			// NOTE: Navigation is now handled automatically by app/index.tsx
			// when the isAuthenticated state changes. We no longer need router.replace() here.
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Registration failed. Please try again.";
			Alert.alert("Registration Failed", errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER ---
	// The JSX part of your component was already perfect and does not need changes.
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
					<SegmentedControl
						options={["Customer", "Driver"]}
						selectedOption={role}
						onSelect={setRole}
					/>
				</View>

				{/* Input fields... */}
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

				{/* Buttons and links... */}
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

// The styles part of your component was also perfect and does not need changes.
const styles = StyleSheet.create({
	container: { flex: 1 },
	innerContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
	title: { fontSize: 40, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
	subtitle: { fontSize: 18, textAlign: "center", marginBottom: 30 },
	inputGroup: { marginBottom: 20 },
	input: { padding: 18, borderRadius: 12, borderWidth: 1, fontSize: 16 },
	button: { padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
	buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
	linkContainer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
	linkText: { fontSize: 16 },
	link: { fontSize: 16, fontWeight: "bold" },
});

export default RegisterScreen;
