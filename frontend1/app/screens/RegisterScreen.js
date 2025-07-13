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

const RegisterScreen = () => {
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

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

			// After successful registration, save the token and user info
			await AsyncStorage.setItem("token", response.data.token);
			await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

			router.replace("/dashboard");
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Registration failed. Please try again.";
			Alert.alert("Registration Failed", errorMessage);
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
				<Text style={styles.title}>Create Account</Text>
				<Text style={styles.subtitle}>Let&apos;s get you on the road.</Text>

				<View style={styles.inputGroup}>
					<TextInput
						style={styles.input}
						placeholder="Full Name"
						placeholderTextColor="#8e8e93"
						value={name}
						onChangeText={setName}
					/>
				</View>

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
						secureTextEntry={true} // For simplicity, we'll omit the show/hide toggle here
						value={password}
						onChangeText={setPassword}
					/>
				</View>

				<TouchableOpacity
					style={styles.button}
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
					<Text style={styles.linkText}>Already have an account? </Text>
					{/* 'router.back()' is the easiest way to go to the previous screen in the stack */}
					<TouchableOpacity onPress={() => router.back()}>
						<Text style={styles.link}>Sign In</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// We can reuse the same style object structure, just tweak text content.
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
		fontSize: 40,
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
	},
	input: {
		backgroundColor: "#ffffff",
		padding: 18,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#ced4da",
		fontSize: 16,
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

export default RegisterScreen;
