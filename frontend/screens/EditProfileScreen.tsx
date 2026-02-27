import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { api } from "../services/api";
import { User } from "../types";

export const EditProfileScreen = () => {
	const { colors } = useTheme();
	const { user, setUser } = useAuth();
	const { showToast } = useToast();
	const navigation = useNavigation<any>();

	const [form, setForm] = useState({
		name: "",
		phone: "",
		email: "",
		vYear: "",
		vMake: "",
		vModel: "",
		vPlate: "",
		vColor: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		if (user) {
			setForm({
				name: user.name || "",
				phone: user.phone || "",
				email: user.email || "",
				vYear: user.vehicle?.year || "",
				vMake: user.vehicle?.make || "",
				vModel: user.vehicle?.model || "",
				vPlate: user.vehicle?.plate || "",
				vColor: user.vehicle?.color || "",
			});
		}
	}, [user]);

	useEffect(() => {
		if (!user) return;
		const isChanged =
			form.name !== user.name ||
			form.phone !== user.phone ||
			form.email !== user.email ||
			form.vYear !== (user.vehicle?.year || "") ||
			form.vMake !== (user.vehicle?.make || "") ||
			form.vModel !== (user.vehicle?.model || "") ||
			form.vPlate !== (user.vehicle?.plate || "") ||
			form.vColor !== (user.vehicle?.color || "");
		setHasChanges(isChanged);
	}, [form, user]);

	// Validation Rules
	const errors: Record<string, string> = {
		name: !form.name ? "Full Name is required" : "",
		phone: !form.phone || !/^\d+$/.test(form.phone) ? "Valid numeric phone required" : "",
		email: !form.email || !/\S+@\S+\.\S+/.test(form.email) ? "Valid email required" : "",
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

	const handleSave = async () => {
		if (!isFormValid || !hasChanges) return;
		setIsSubmitting(true);

		try {
			const updatedUser: User = {
				...user!,
				name: form.name,
				phone: form.phone,
				email: form.email,
				vehicle: {
					year: form.vYear,
					make: form.vMake,
					model: form.vModel,
					plate: form.vPlate,
					color: form.vColor || undefined,
				},
			};

			const response = await api.put<any>("/users/profile", updatedUser);

			if (response.data.success) {
				setUser(updatedUser);
				showToast("Profile updated successfully!", "success");
				navigation.goBack();
			} else {
				throw new Error("Failed to update profile");
			}
		} catch (err: any) {
			const backendError =
				err.response?.data?.error || err.response?.data?.message || err.message;
			showToast(backendError || "Failed to update profile", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderInput = (
		label: string,
		field: keyof typeof form,
		keyboardType: any = "default",
		autoCapitalize: any = field === "email" ? "none" : "words",
		editable: boolean = true,
	) => {
		const errorMsg = errors[field];
		const hasError = errorMsg !== "";

		return (
			<View style={styles.inputContainer} key={field}>
				<Text style={[styles.label, { color: colors.text }]}>{label}</Text>
				<TextInput
					style={[
						styles.input,
						{
							borderColor: hasError ? colors.danger : colors.border,
							color: editable ? colors.text : colors.textMuted,
							backgroundColor: editable ? colors.background : colors.card,
						},
					]}
					value={form[field]}
					onChangeText={val => handleChange(field, val)}
					keyboardType={keyboardType}
					placeholderTextColor={colors.textMuted}
					autoCapitalize={autoCapitalize}
					editable={editable}
				/>
			</View>
		);
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["bottom", "left", "right"]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
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
						{renderInput("Email Address *", "email", "email-address", "none", false)}
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
						{renderInput("License Plate *", "vPlate", "default", "characters")}
					</Card>

					<View style={styles.footer}>
						<PrimaryButton
							title="Save Changes"
							onPress={handleSave}
							isLoading={isSubmitting}
							disabled={!isFormValid || !hasChanges || isSubmitting}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	scrollContent: { padding: 16, paddingBottom: 40 },
	card: { padding: 20, marginBottom: 16 },
	sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 16, letterSpacing: 1 },
	inputContainer: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
	input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
	row: { flexDirection: "row", justifyContent: "space-between" },
	halfWidth: { width: "48%" },
	footer: { marginTop: 8 },
});
