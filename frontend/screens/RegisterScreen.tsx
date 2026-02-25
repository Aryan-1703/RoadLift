import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";
import { RegisterDTO } from "../types";

export const RegisterScreen = () => {
	const { colors } = useTheme();
	const { register } = useAuth();
	const { showToast } = useToast();
	const navigation = useNavigation<any>();

	const [form, setForm] = useState({
		name: "",
		phone: "",
		email: "",
		password: "",
		confirmPassword: "",
		vYear: "",
		vMake: "",
		vModel: "",
		vPlate: "",
		vColor: "",
	});

	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Validation Rules
	const errors: Record<string, string> = {
		name: !form.name ? "Full Name is required" : "",
		phone: !form.phone || !/^\d+$/.test(form.phone) ? "Valid numeric phone required" : "",
		email: !form.email || !/\S+@\S+\.\S+/.test(form.email) ? "Valid email required" : "",
		password:
			!form.password || form.password.length < 8
				? "Password must be at least 8 chars"
				: "",
		confirmPassword:
			form.password !== form.confirmPassword ? "Passwords do not match" : "",
		vYear:
			!form.vYear || !/^\d{4}$/.test(form.vYear) ? "Valid 4-digit year required" : "",
		vMake: !form.vMake ? "Vehicle Make is required" : "",
		vModel: !form.vModel ? "Vehicle Model is required" : "",
		vPlate: !form.vPlate ? "License Plate is required" : "",
	};

	const isFormValid = Object.values(errors).every(err => err === "");

	const handleChange = (field: string, value: string) => {
		setForm(prev => ({ ...prev, [field]: value }));
	};

	const handleBlur = (field: string) => {
		setTouched(prev => ({ ...prev, [field]: true }));
	};

	const handleRegister = async () => {
		if (!isFormValid) return;
		setIsSubmitting(true);

		const payload: RegisterDTO = {
			name: form.name,
			phone: form.phone,
			email: form.email,
			password: form.password,
			vehicle: {
				year: form.vYear,
				make: form.vMake,
				model: form.vModel,
				plate: form.vPlate,
				color: form.vColor || undefined,
			},
		};

		try {
			await register(payload);
			showToast("Registration successful! Logging you in...", "success");
			// AuthContext will automatically redirect to App stack since 'user' is populated
		} catch (err: any) {
			const backendError =
				err.response?.data?.error || err.response?.data?.message || err.message;
			showToast(backendError || "Registration failed", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Helper function instead of a Component to prevent React from re-mounting inputs on state change
	const renderInput = (
		label: string,
		field: keyof typeof form,
		keyboardType: any = "default",
		secureTextEntry: boolean = false,
		autoCapitalize: any = field === "email" ? "none" : "words",
	) => {
		const errorMsg = errors[field];
		const isTouched = touched[field];
		const hasError = isTouched && errorMsg;

		return (
			<View style={styles.inputContainer} key={field}>
				<Text style={[styles.label, { color: colors.text }]}>{label}</Text>
				<TextInput
					style={[
						styles.input,
						{
							borderColor: hasError ? colors.danger : colors.border,
							color: colors.text,
							backgroundColor: colors.background,
						},
					]}
					value={form[field]}
					onChangeText={val => handleChange(field, val)}
					onBlur={() => handleBlur(field)}
					keyboardType={keyboardType}
					secureTextEntry={secureTextEntry}
					placeholderTextColor={colors.textMuted}
					autoCapitalize={autoCapitalize}
				/>
				{hasError ? (
					<Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
				) : null}
			</View>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<View
					style={[
						styles.header,
						{ borderBottomColor: colors.border, backgroundColor: colors.card },
					]}
				>
					<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
						<Ionicons name="chevron-back" size={24} color={colors.text} />
						<Text style={[styles.backText, { color: colors.text }]}>Back</Text>
					</TouchableOpacity>
					<Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
				</View>

				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Card style={styles.card}>
						<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
							PERSONAL INFO
						</Text>
						{renderInput("Full Name *", "name")}
						{renderInput("Phone Number *", "phone", "phone-pad")}
						{renderInput("Email Address *", "email", "email-address")}
						{renderInput("Password *", "password", "default", true)}
						{renderInput("Confirm Password *", "confirmPassword", "default", true)}
					</Card>

					<Card style={styles.card}>
						<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
							VEHICLE INFO
						</Text>
						<View style={styles.row}>
							<View style={styles.halfWidth}>
								{renderInput("Year *", "vYear", "numeric")}
							</View>
							<View style={styles.halfWidth}>{renderInput("Make *", "vMake")}</View>
						</View>
						<View style={styles.row}>
							<View style={styles.halfWidth}>{renderInput("Model *", "vModel")}</View>
							<View style={styles.halfWidth}>{renderInput("Color", "vColor")}</View>
						</View>
						{renderInput("License Plate *", "vPlate", "default", false, "characters")}
					</Card>

					<View style={styles.footer}>
						<PrimaryButton
							title="Register"
							onPress={handleRegister}
							isLoading={isSubmitting}
							disabled={!isFormValid}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { padding: 16, paddingBottom: 20, borderBottomWidth: 1 },
	backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	backText: { fontSize: 16, fontWeight: "bold" },
	title: { fontSize: 28, fontWeight: "bold" },
	scrollContent: { padding: 16, paddingBottom: 40 },
	card: { padding: 20, marginBottom: 16 },
	sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 16, letterSpacing: 1 },
	inputContainer: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
	input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
	errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
	row: { flexDirection: "row", justifyContent: "space-between" },
	halfWidth: { width: "48%" },
	footer: { marginTop: 8 },
});
