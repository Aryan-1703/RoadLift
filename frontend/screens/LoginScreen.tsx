import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	TouchableOpacity,
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
	const { login, getRememberedEmail } = useAuth();
	const navigation = useNavigation<any>();

	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [rememberEmail, setRememberEmail] = useState(false);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const loadRememberedEmail = async () => {
			const remembered = await getRememberedEmail();
			if (remembered) {
				setPhoneNumber(remembered);
				setRememberEmail(true);
			}
		};
		loadRememberedEmail();
	}, [getRememberedEmail]);

	const handleLogin = async () => {
		if (!phoneNumber) {
			setError("Phone Number is required");
			return;
		}
		if (!password) {
			setError("Password is required");
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			await login(phoneNumber, password, rememberEmail);
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
						<Ionicons name="car-sport" size={48} color="#FFF" />
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
						placeholder="Enter your phone number"
						placeholderTextColor={colors.textMuted}
					/>

					<Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
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
						placeholder="Enter your password"
						placeholderTextColor={colors.textMuted}
					/>

					<TouchableOpacity
						style={styles.checkboxContainer}
						onPress={() => setRememberEmail(!rememberEmail)}
						activeOpacity={0.7}
					>
						<Ionicons
							name={rememberEmail ? "checkbox" : "square-outline"}
							size={24}
							color={rememberEmail ? colors.primary : colors.textMuted}
						/>
						<Text style={[styles.checkboxLabel, { color: colors.text }]}>
							Remember Phone Number
						</Text>
					</TouchableOpacity>

					{error ? <Text style={styles.error}>{error}</Text> : null}

					<PrimaryButton
						title="Sign In"
						onPress={handleLogin}
						isLoading={isSubmitting}
						disabled={isSubmitting}
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
	header: { alignItems: "center", marginBottom: 48 },
	iconContainer: {
		padding: 20,
		borderRadius: 24,
		marginBottom: 20,
		transform: [{ rotate: "-5deg" }],
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 5,
	},
	title: { fontSize: 36, fontWeight: "800", letterSpacing: -0.5 },
	subtitle: { fontSize: 16, marginTop: 8, letterSpacing: 0.2 },
	form: { padding: 24 },
	label: { fontSize: 14, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
	input: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16 },
	checkboxContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 20,
	},
	checkboxLabel: {
		marginLeft: 10,
		fontSize: 15,
		fontWeight: "500",
	},
	error: {
		color: "#DC2626",
		marginTop: 16,
		textAlign: "center",
		lineHeight: 20,
		fontWeight: "500",
	},
	button: { marginTop: 32 },
	registerButton: { marginTop: 16 },
});
