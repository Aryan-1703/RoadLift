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

const API_URL = "http://10.0.0.125:8001/api";

const LoginScreen = () => {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async () => {
		if (!phoneNumber || !password) {
			Alert.alert("Missing Fields", "Please enter both phone number and password.");
			return;
		}
		setIsLoading(true);

		try {
			const response = await axios.post(`${API_URL}/auth/login/user`, {
				phoneNumber,
				password,
			});

			await AsyncStorage.setItem("token", response.data.token);
			await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
			router.replace("/tabs");
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Login failed. Please try again.";
			Alert.alert("Login Failed", errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.innerContainer}
			>
				<Text style={styles.title}>TowLink</Text>
				<Text style={styles.subtitle}>Welcome back! Please sign in.</Text>

				<View style={styles.inputGroup}>
					<TextInput
						style={styles.input}
						placeholder="Phone Number"
						placeholderTextColor="#8e8e93"
						keyboardType="phone-pad"
						value={phoneNumber}
						onChangeText={setPhoneNumber}
					/>
				</View>

				<View style={styles.inputGroup}>
					<TextInput
						style={styles.input}
						placeholder="Password"
						placeholderTextColor="#8e8e93"
						secureTextEntry={!isPasswordVisible}
						value={password}
						onChangeText={setPassword}
					/>
					<TouchableOpacity
						style={styles.eyeButton}
						onPress={() => setIsPasswordVisible(!isPasswordVisible)}
					>
						<Text style={styles.eyeButtonText}>
							{isPasswordVisible ? "Hide" : "Show"}
						</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					style={styles.button}
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
					<Text style={styles.linkText}>Don&apos;t have an account? </Text>
					<TouchableOpacity onPress={() => router.push("/register")}>
						<Text style={styles.link}>Register</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f2f5",
	},
	innerContainer: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 48,
		fontWeight: "bold",
		color: "#007aff",
		textAlign: "center",
		marginBottom: 10,
	},
	subtitle: {
		fontSize: 18,
		color: "#6c757d",
		textAlign: "center",
		marginBottom: 50,
	},
	inputGroup: {
		marginBottom: 20,
		position: "relative",
	},
	input: {
		backgroundColor: "#ffffff",
		padding: 18,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#ced4da",
		fontSize: 16,
		paddingRight: 60, // Make space for the "Show" button
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
		color: "#007aff",
		fontWeight: "600",
	},
	button: {
		backgroundColor: "#007aff",
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
		color: "#6c757d",
	},
	link: {
		fontSize: 16,
		color: "#007aff",
		fontWeight: "bold",
	},
});

export default LoginScreen;
