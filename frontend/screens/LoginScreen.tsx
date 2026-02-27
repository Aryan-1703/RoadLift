import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config";

export const LoginScreen = () => {
	const { colors } = useTheme();
	const { login } = useAuth();
	const navigation = useNavigation<any>();

	const [phoneNumber, setPhoneNumber] = useState("5550199");
	const [password, setPassword] = useState("password123");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleLogin = async () => {
		setError("");
		setIsSubmitting(true);
		try {
			await login(phoneNumber, password);
		} catch (err: any) {
			const backendError = err.response?.data?.error || err.response?.data?.message;
			const fallbackError =
				err.message === "Network Error"
					? `Network Error: Cannot reach backend at ${API_URL}.\n\nIf you are testing on a physical phone, you MUST enter your computer's Wi-Fi IP address in frontend/config.ts!`
					: err.message;

			setError(backendError || fallbackError || "Failed to login");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardView}
			>
				<View style={styles.header}>
					<View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
						<Ionicons name="car-sport" size={40} color="#FFF" />
					</View>
					<Text style={[styles.title, { color: colors.text }]}>RoadLift</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						On-demand roadside assistance.
					</Text>
				</View>

				<Card style={styles.form}>
					<Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								color: colors.text,
								backgroundColor: colors.background,
							},
						]}
						value={phoneNumber}
						onChangeText={setPhoneNumber}
						keyboardType="phone-pad"
						autoCapitalize="none"
					/>

					<Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
						Password
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								color: colors.text,
								backgroundColor: colors.background,
							},
						]}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>

					{error ? <Text style={styles.error}>{error}</Text> : null}

					<PrimaryButton
						title="Sign In"
						onPress={handleLogin}
						isLoading={isSubmitting}
						style={styles.button}
					/>

					<PrimaryButton
						title="Create an Account"
						variant="secondary"
						onPress={() => navigation.navigate("Register")}
						disabled={isSubmitting}
						style={styles.registerButton}
					/>
				</Card>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	keyboardView: { flex: 1, justifyContent: "center", padding: 24 },
	header: { alignItems: "center", marginBottom: 40 },
	iconContainer: {
		padding: 16,
		borderRadius: 20,
		marginBottom: 16,
		transform: [{ rotate: "-5deg" }],
	},
	title: { fontSize: 32, fontWeight: "bold" },
	subtitle: { fontSize: 16, marginTop: 8 },
	form: { padding: 20 },
	label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
	input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
	error: { color: "#DC2626", marginTop: 12, textAlign: "center", lineHeight: 20 },
	button: { marginTop: 24 },
	registerButton: { marginTop: 12 },
});
