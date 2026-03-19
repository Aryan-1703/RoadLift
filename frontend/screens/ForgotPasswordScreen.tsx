import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { api } from "../services/api";

type Step = "email" | "code" | "password" | "done";

export const ForgotPasswordScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const navigation = useNavigation<any>();

	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPw, setShowPw] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const inputBg = isDarkMode ? "#0a1020" : "#F7F4EF";
	const inputBorder = isDarkMode ? "rgba(255,255,255,0.10)" : "#D4CFC8";

	const handleSendCode = async () => {
		if (!email || !/\S+@\S+\.\S+/.test(email)) {
			setError("Please enter a valid email address.");
			return;
		}
		setError("");
		setIsLoading(true);
		try {
			await api.post("/auth/forgot-password", { email });
			setStep("code");
		} catch (err: any) {
			setError(err?.response?.data?.message ?? "Failed to send reset code.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyCode = () => {
		if (!code || code.length < 6) {
			setError("Please enter the 6-character code from your email.");
			return;
		}
		setError("");
		setStep("password");
	};

	const handleResetPassword = async () => {
		if (!newPassword || newPassword.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		setError("");
		setIsLoading(true);
		try {
			await api.post("/auth/reset-password", { token: code, newPassword });
			setStep("done");
		} catch (err: any) {
			setError(err?.response?.data?.message ?? "Failed to reset password.");
		} finally {
			setIsLoading(false);
		}
	};

	const renderContent = () => {
		if (step === "done") {
			return (
				<View style={styles.doneContainer}>
					<View style={[styles.doneIcon, { backgroundColor: colors.greenBg ?? "#D1FAE5" }]}>
						<Ionicons name="checkmark-circle" size={52} color={colors.green ?? "#059669"} />
					</View>
					<Text style={[styles.doneTitle, { color: colors.text }]}>Password Reset!</Text>
					<Text style={[styles.doneDesc, { color: colors.textMuted }]}>
						Your password has been updated. You can now sign in with your new password.
					</Text>
					<PrimaryButton
						title="Back to Sign In"
						onPress={() => navigation.navigate("Login")}
						style={{ marginTop: 8 }}
					/>
				</View>
			);
		}

		if (step === "email") {
			return (
				<>
					<Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Enter your email address and we'll send you a reset code.
					</Text>
					<View style={styles.field}>
						<Text style={[styles.label, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
						<View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
							<Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={email}
								onChangeText={setEmail}
								placeholder="you@example.com"
								placeholderTextColor={colors.textMuted}
								keyboardType="email-address"
								autoCapitalize="none"
								autoComplete="email"
								returnKeyType="done"
								onSubmitEditing={handleSendCode}
							/>
						</View>
					</View>
					{!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
					<PrimaryButton title="Send Reset Code" onPress={handleSendCode} isLoading={isLoading} />
				</>
			);
		}

		if (step === "code") {
			return (
				<>
					<Text style={[styles.title, { color: colors.text }]}>Check Your Email</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Enter the 6-character code we sent to {email}.
					</Text>
					<View style={styles.field}>
						<Text style={[styles.label, { color: colors.textMuted }]}>RESET CODE</Text>
						<View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
							<Ionicons name="key-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
							<TextInput
								style={[styles.input, { color: colors.text, letterSpacing: 4, fontWeight: "700" }]}
								value={code}
								onChangeText={v => setCode(v.toUpperCase())}
								placeholder="ABC123"
								placeholderTextColor={colors.textMuted}
								autoCapitalize="characters"
								returnKeyType="done"
								onSubmitEditing={handleVerifyCode}
								maxLength={6}
							/>
						</View>
					</View>
					{!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
					<PrimaryButton title="Verify Code" onPress={handleVerifyCode} />
					<TouchableOpacity onPress={handleSendCode} style={styles.resendLink} activeOpacity={0.7}>
						<Text style={[styles.resendText, { color: colors.primary }]}>Resend code</Text>
					</TouchableOpacity>
				</>
			);
		}

		// step === "password"
		return (
			<>
				<Text style={[styles.title, { color: colors.text }]}>New Password</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Choose a new password for your account.
				</Text>
				<View style={styles.field}>
					<Text style={[styles.label, { color: colors.textMuted }]}>NEW PASSWORD</Text>
					<View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
						<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
						<TextInput
							style={[styles.input, { color: colors.text }]}
							value={newPassword}
							onChangeText={setNewPassword}
							placeholder="Min 8 characters"
							placeholderTextColor={colors.textMuted}
							secureTextEntry={!showPw}
							returnKeyType="next"
						/>
						<TouchableOpacity onPress={() => setShowPw(v => !v)}>
							<Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={colors.textMuted} />
						</TouchableOpacity>
					</View>
				</View>
				<View style={styles.field}>
					<Text style={[styles.label, { color: colors.textMuted }]}>CONFIRM PASSWORD</Text>
					<View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
						<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
						<TextInput
							style={[styles.input, { color: colors.text }]}
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							placeholder="Repeat password"
							placeholderTextColor={colors.textMuted}
							secureTextEntry={!showPw}
							returnKeyType="done"
							onSubmitEditing={handleResetPassword}
						/>
					</View>
				</View>
				{!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
				<PrimaryButton title="Reset Password" onPress={handleResetPassword} isLoading={isLoading} />
			</>
		);
	};

	return (
		<View style={[styles.screen, { backgroundColor: colors.background }]}>
			<SafeAreaView style={{ flex: 1 }}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					style={{ flex: 1 }}
				>
					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<TouchableOpacity
							onPress={() => navigation.goBack()}
							style={styles.backBtn}
							activeOpacity={0.7}
						>
							<Ionicons name="arrow-back" size={22} color={colors.text} />
						</TouchableOpacity>
						<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
							{renderContent()}
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</View>
	);
};

const styles = StyleSheet.create({
	screen: { flex: 1 },
	scroll: { padding: 20, paddingTop: 12, paddingBottom: 40 },
	backBtn: { marginBottom: 16, alignSelf: "flex-start", padding: 4 },
	card: {
		borderRadius: 24,
		borderWidth: 1,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
	},
	title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
	subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
	field: { marginBottom: 16 },
	label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
	inputWrap: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
	},
	input: { flex: 1, fontSize: 15, paddingVertical: 0 },
	error: { fontSize: 13, marginBottom: 12 },
	resendLink: { alignItems: "center", marginTop: 14 },
	resendText: { fontSize: 14, fontWeight: "600" },
	doneContainer: { alignItems: "center", paddingVertical: 8 },
	doneIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 20 },
	doneTitle: { fontSize: 24, fontWeight: "800", marginBottom: 10 },
	doneDesc: { fontSize: 15, lineHeight: 24, textAlign: "center", marginBottom: 24 },
});
