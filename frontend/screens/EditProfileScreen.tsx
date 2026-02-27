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

import { Ionicons } from "@expo/vector-icons";

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
		companyName: "",
		serviceArea: "",
		licenseNumber: "",
		vehicleType: "",
		insuranceNumber: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [showSuccess, setShowSuccess] = useState(false);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const res = await api.get('/users/profile');
				if (res.data.user) {
					setUser(prev => prev ? { ...prev, ...res.data.user } : res.data.user);
				}
			} catch (e) {
				console.error("Failed to fetch latest profile", e);
			} finally {
				setIsLoading(false);
			}
		};
		fetchProfile();
	}, []);

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
				companyName: user.driverProfile?.companyName || "",
				serviceArea: user.driverProfile?.serviceArea || "",
				licenseNumber: user.driverProfile?.licenseNumber || "",
				vehicleType: user.driverProfile?.vehicleType || "",
				insuranceNumber: user.driverProfile?.insuranceNumber || "",
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
			form.vColor !== (user.vehicle?.color || "") ||
			form.companyName !== (user.driverProfile?.companyName || "") ||
			form.serviceArea !== (user.driverProfile?.serviceArea || "") ||
			form.licenseNumber !== (user.driverProfile?.licenseNumber || "") ||
			form.vehicleType !== (user.driverProfile?.vehicleType || "") ||
			form.insuranceNumber !== (user.driverProfile?.insuranceNumber || "");
		setHasChanges(isChanged);
	}, [form, user]);

	// Validation Rules
	const errors: Record<string, string> = {
		name: !form.name ? "Full Name is required" : "",
		phone: !form.phone || !/^\d+$/.test(form.phone) ? "Valid numeric phone required" : "",
		email: !form.email || !/\S+@\S+\.\S+/.test(form.email) ? "Valid email required" : "",
		...(user?.role === "CUSTOMER" ? {
			vYear: !form.vYear || !/^\d{4}$/.test(form.vYear) ? "Valid 4-digit year required" : "",
			vMake: !form.vMake ? "Vehicle Make is required" : "",
			vModel: !form.vModel ? "Vehicle Model is required" : "",
			vPlate: !form.vPlate ? "License Plate is required" : "",
		} : {}),
		...(user?.role === "DRIVER" ? {
			companyName: !form.companyName ? "Company Name is required" : "",
			serviceArea: !form.serviceArea ? "Service Area is required" : "",
			licenseNumber: !form.licenseNumber ? "License Number is required" : "",
			vehicleType: !form.vehicleType ? "Vehicle Type is required" : "",
		} : {}),
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
				...(user?.role === "CUSTOMER" ? {
					vehicle: {
						year: form.vYear,
						make: form.vMake,
						model: form.vModel,
						plate: form.vPlate,
						color: form.vColor || undefined,
					}
				} : {}),
				...(user?.role === "DRIVER" ? {
					driverProfile: {
						companyName: form.companyName,
						serviceArea: form.serviceArea,
						licenseNumber: form.licenseNumber,
						vehicleType: form.vehicleType,
						insuranceNumber: form.insuranceNumber || undefined,
					}
				} : {}),
			};

			const response = await api.put<any>("/users/profile", updatedUser);
			
			if (response.data.success) {
				setUser(updatedUser);
				setShowSuccess(true);
				setTimeout(() => {
					setShowSuccess(false);
					navigation.goBack();
				}, 1500);
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
		editable: boolean = true
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
				{hasError && form[field] !== "" ? (
					<Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
				) : null}
			</View>
		);
	};

	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<Card style={styles.card}>
						<View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
						<View style={[styles.skeletonInput, { backgroundColor: colors.border }]} />
						<View style={[styles.skeletonInput, { backgroundColor: colors.border }]} />
						<View style={[styles.skeletonInput, { backgroundColor: colors.border }]} />
					</Card>
					<Card style={styles.card}>
						<View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
						<View style={[styles.skeletonInput, { backgroundColor: colors.border }]} />
						<View style={[styles.skeletonInput, { backgroundColor: colors.border }]} />
					</Card>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
			{showSuccess && (
				<View style={[StyleSheet.absoluteFill, styles.successOverlay, { backgroundColor: colors.background + 'E6' }]}>
					<View style={[styles.successCircle, { backgroundColor: colors.primary }]}>
						<Ionicons name="checkmark" size={48} color="#FFF" />
					</View>
					<Text style={[styles.successText, { color: colors.text }]}>Profile Saved!</Text>
				</View>
			)}
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
						{renderInput("Email Address *", "email", "email-address", "none", true)}
					</Card>

					{user?.role === "CUSTOMER" && (
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
					)}

					{user?.role === "DRIVER" && (
						<Card style={styles.card}>
							<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
								DRIVER PROFILE
							</Text>
							{renderInput("Company Name *", "companyName")}
							{renderInput("Service Area *", "serviceArea")}
							{renderInput("License Number *", "licenseNumber", "default", "characters")}
							{renderInput("Vehicle Type *", "vehicleType")}
							{renderInput("Insurance Number (Optional)", "insuranceNumber", "default", "characters")}
						</Card>
					)}

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
	errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
	row: { flexDirection: "row", justifyContent: "space-between" },
	halfWidth: { width: "48%" },
	footer: { marginTop: 8 },
	skeletonTitle: { width: 100, height: 16, borderRadius: 4, marginBottom: 24 },
	skeletonInput: { width: '100%', height: 50, borderRadius: 12, marginBottom: 16 },
	successOverlay: { zIndex: 100, alignItems: 'center', justifyContent: 'center' },
	successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
	successText: { fontSize: 24, fontWeight: 'bold' },
});
