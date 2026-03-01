import React, { useState, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	TouchableOpacity,
	Animated,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { RegisterDTO } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Step config ───────────────────────────────────────────────────────────────
const CUSTOMER_STEPS = ["Role", "Personal", "Vehicle", "Password"];
const DRIVER_STEPS = ["Role", "Personal", "Profile", "Password"];

export const RegisterScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { register } = useAuth();
	const { showToast } = useToast();
	const navigation = useNavigation<any>();

	const [role, setRole] = useState<"CUSTOMER" | "DRIVER">("CUSTOMER");
	const [step, setStep] = useState(0); // 0=Role, 1=Personal, 2=Vehicle/Profile, 3=Password
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Slide animation
	const slideAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(1)).current;

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
		companyName: "",
		serviceArea: "",
		licenseNumber: "",
		vehicleType: "",
		insuranceNumber: "",
	});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [showPass, setShowPass] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [focusedField, setFocusedField] = useState<string | null>(null);

	const steps = role === "CUSTOMER" ? CUSTOMER_STEPS : DRIVER_STEPS;
	const totalSteps = steps.length;

	// ── Validation ────────────────────────────────────────────────────────────
	const errors: Record<string, string> = {
		name: !form.name ? "Full name is required" : "",
		phone: !form.phone || !/^\d+$/.test(form.phone) ? "Valid numeric phone required" : "",
		email: !form.email || !/\S+@\S+\.\S+/.test(form.email) ? "Valid email required" : "",
		password: !form.password || form.password.length < 8 ? "Minimum 8 characters" : "",
		confirmPassword:
			form.password !== form.confirmPassword ? "Passwords do not match" : "",
		...(role === "CUSTOMER"
			? {
					vYear: !form.vYear || !/^\d{4}$/.test(form.vYear) ? "Valid 4-digit year" : "",
					vMake: !form.vMake ? "Make is required" : "",
					vModel: !form.vModel ? "Model is required" : "",
					vPlate: !form.vPlate ? "Plate is required" : "",
				}
			: {
					companyName: !form.companyName ? "Company name is required" : "",
					serviceArea: !form.serviceArea ? "Service area is required" : "",
					licenseNumber: !form.licenseNumber ? "License number is required" : "",
					vehicleType: !form.vehicleType ? "Vehicle type is required" : "",
				}),
	};

	const stepFields: Record<number, string[]> = {
		0: [],
		1: ["name", "phone", "email"],
		2:
			role === "CUSTOMER"
				? ["vYear", "vMake", "vModel", "vPlate"]
				: ["companyName", "serviceArea", "licenseNumber", "vehicleType"],
		3: ["password", "confirmPassword"],
	};

	const isStepValid = (s: number) => {
		if (s === 0) return true;
		return stepFields[s].every(f => !errors[f]);
	};
	const isFormValid = Object.values(errors).every(e => e === "");

	// ── Navigation ────────────────────────────────────────────────────────────
	const animateStep = (direction: "forward" | "back", callback: () => void) => {
		const outX = direction === "forward" ? -SCREEN_WIDTH * 0.15 : SCREEN_WIDTH * 0.15;
		Animated.parallel([
			Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
			Animated.timing(slideAnim, { toValue: outX, duration: 160, useNativeDriver: true }),
		]).start(() => {
			callback();
			slideAnim.setValue(
				direction === "forward" ? SCREEN_WIDTH * 0.15 : -SCREEN_WIDTH * 0.15,
			);
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 55,
					friction: 10,
					useNativeDriver: true,
				}),
			]).start();
		});
	};

	const goNext = () => {
		// Touch all fields in current step so errors show
		const fields = stepFields[step];
		setTouched(prev => ({ ...prev, ...Object.fromEntries(fields.map(f => [f, true])) }));
		if (!isStepValid(step)) return;
		if (step < totalSteps - 1) {
			animateStep("forward", () => setStep(s => s + 1));
		}
	};

	const goBack = () => {
		if (step > 0) {
			animateStep("back", () => setStep(s => s - 1));
		} else {
			navigation.goBack();
		}
	};

	// ── Submit ────────────────────────────────────────────────────────────────
	const handleRegister = async () => {
		setTouched(Object.fromEntries(Object.keys(errors).map(k => [k, true])));
		if (!isFormValid) return;
		setIsSubmitting(true);
		const payload: RegisterDTO = {
			name: form.name,
			phone: form.phone,
			email: form.email,
			password: form.password,
			role,
			...(role === "CUSTOMER"
				? {
						vehicle: {
							year: form.vYear,
							make: form.vMake,
							model: form.vModel,
							plate: form.vPlate,
							color: form.vColor || undefined,
						},
					}
				: {
						driverProfile: {
							companyName: form.companyName,
							serviceArea: form.serviceArea,
							licenseNumber: form.licenseNumber,
							vehicleType: form.vehicleType,
							insuranceNumber: form.insuranceNumber || undefined,
						},
					}),
		};
		try {
			await register(payload);
			showToast("Welcome to RoadLift!", "success");
		} catch (err: any) {
			const msg = err.response?.data?.error || err.response?.data?.message || err.message;
			showToast(msg || "Registration failed", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (field: string, value: string) =>
		setForm(prev => ({ ...prev, [field]: value }));
	const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

	// ── Derived colors ────────────────────────────────────────────────────────
	const inputBg = isDarkMode ? "#0a1020" : "#F7F4EF";
	const inputBorder = isDarkMode ? "rgba(255,255,255,0.10)" : "#D4CFC8";
	const divider = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";

	// ── Reusable field renderer ───────────────────────────────────────────────
	const renderField = (
		label: string,
		field: keyof typeof form,
		opts: {
			icon?: React.ComponentProps<typeof Ionicons>["name"];
			keyboardType?: any;
			autoCapitalize?: any;
			secure?: boolean;
			showToggle?: boolean;
			showState?: boolean;
			onToggle?: () => void;
			placeholder?: string;
		} = {},
	) => {
		const hasError = touched[field] && !!errors[field];
		const isFocused = focusedField === field;
		const borderColor = hasError
			? colors.danger
			: isFocused
				? colors.primary
				: inputBorder;
		const shadowOpacity = isFocused ? 0.15 : 0;

		return (
			<View style={styles.fieldGroup} key={field}>
				<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
				<View
					style={[
						styles.inputWrapper,
						{
							backgroundColor: inputBg,
							borderColor,
							shadowColor: colors.primary,
							shadowOpacity,
							shadowOffset: { width: 0, height: 0 },
							shadowRadius: 8,
						},
					]}
				>
					{opts.icon && (
						<Ionicons
							name={opts.icon}
							size={17}
							color={isFocused ? colors.primary : colors.textMuted}
							style={styles.fieldIcon}
						/>
					)}
					<TextInput
						style={[styles.input, { color: colors.text }]}
						value={form[field]}
						onChangeText={v => handleChange(field, v)}
						onBlur={() => {
							handleBlur(field);
							setFocusedField(null);
						}}
						onFocus={() => setFocusedField(field)}
						keyboardType={opts.keyboardType || "default"}
						secureTextEntry={opts.secure && !opts.showState}
						autoCapitalize={opts.autoCapitalize ?? "words"}
						placeholder={opts.placeholder || ""}
						placeholderTextColor={colors.textMuted}
					/>
					{opts.showToggle && (
						<TouchableOpacity
							onPress={opts.onToggle}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Ionicons
								name={opts.showState ? "eye-off-outline" : "eye-outline"}
								size={17}
								color={colors.textMuted}
							/>
						</TouchableOpacity>
					)}
				</View>
				{hasError && (
					<View style={styles.errorRow}>
						<Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
						<Text style={[styles.errorText, { color: colors.danger }]}>
							{errors[field]}
						</Text>
					</View>
				)}
			</View>
		);
	};

	// ── Step content ──────────────────────────────────────────────────────────
	const renderStep = () => {
		switch (step) {
			// ── Step 0: Role ─────────────────────────────────────────────────
			case 0:
				return (
					<View>
						<Text style={[styles.stepTitle, { color: colors.text }]}>
							I'm joining as a…
						</Text>
						<Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
							Choose your account type to get started
						</Text>
						<View style={styles.roleGrid}>
							{(["CUSTOMER", "DRIVER"] as const).map(r => {
								const active = role === r;
								return (
									<TouchableOpacity
										key={r}
										style={[
											styles.roleCard,
											{
												backgroundColor: active
													? colors.accentBg
													: isDarkMode
														? "rgba(255,255,255,0.03)"
														: "rgba(27,25,22,0.03)",
												borderColor: active ? colors.primary : divider,
											},
										]}
										onPress={() => setRole(r)}
										activeOpacity={0.75}
									>
										{/* Check indicator */}
										<View
											style={[
												styles.roleCheck,
												{
													borderColor: active ? colors.primary : divider,
													backgroundColor: active ? colors.primary : "transparent",
												},
											]}
										>
											{active && <Ionicons name="checkmark" size={11} color="#fff" />}
										</View>

										<View
											style={[
												styles.roleIconWrap,
												{
													backgroundColor: active
														? colors.primary
														: isDarkMode
															? "rgba(255,255,255,0.06)"
															: "#EDE9E2",
												},
											]}
										>
											<Ionicons
												name={r === "CUSTOMER" ? "person" : "car-sport"}
												size={28}
												color={active ? "#fff" : colors.textMuted}
											/>
										</View>
										<Text
											style={[
												styles.roleTitle,
												{ color: active ? colors.text : colors.textMuted },
											]}
										>
											{r === "CUSTOMER" ? "Customer" : "Driver"}
										</Text>
										<Text style={[styles.roleDesc, { color: colors.textMuted }]}>
											{r === "CUSTOMER"
												? "Request roadside help when you need it"
												: "Earn money providing roadside assistance"}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				);

			// ── Step 1: Personal Info ─────────────────────────────────────────
			case 1:
				return (
					<View>
						<Text style={[styles.stepTitle, { color: colors.text }]}>Personal Info</Text>
						<Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
							Your name, contact details
						</Text>
						{renderField("Full Name", "name", {
							icon: "person-outline",
							placeholder: "John Smith",
						})}
						{renderField("Phone Number", "phone", {
							icon: "call-outline",
							keyboardType: "phone-pad",
							autoCapitalize: "none",
							placeholder: "6471234567",
						})}
						{renderField("Email Address", "email", {
							icon: "mail-outline",
							keyboardType: "email-address",
							autoCapitalize: "none",
							placeholder: "john@example.com",
						})}
					</View>
				);

			// ── Step 2: Vehicle / Driver Profile ──────────────────────────────
			case 2:
				return role === "CUSTOMER" ? (
					<View>
						<Text style={[styles.stepTitle, { color: colors.text }]}>Your Vehicle</Text>
						<Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
							So we know what we're helping with
						</Text>
						<View style={styles.twoCol}>
							<View style={styles.colHalf}>
								{renderField("Year", "vYear", {
									icon: "calendar-outline",
									keyboardType: "numeric",
									autoCapitalize: "none",
									placeholder: "2022",
								})}
							</View>
							<View style={styles.colHalf}>
								{renderField("Make", "vMake", {
									icon: "car-outline",
									placeholder: "Toyota",
								})}
							</View>
						</View>
						<View style={styles.twoCol}>
							<View style={styles.colHalf}>
								{renderField("Model", "vModel", { placeholder: "Camry" })}
							</View>
							<View style={styles.colHalf}>
								{renderField("Color", "vColor", { placeholder: "Silver" })}
							</View>
						</View>
						{renderField("License Plate", "vPlate", {
							icon: "id-card-outline",
							autoCapitalize: "characters",
							placeholder: "ABCD 1234",
						})}
					</View>
				) : (
					<View>
						<Text style={[styles.stepTitle, { color: colors.text }]}>Driver Profile</Text>
						<Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
							Your business & credentials
						</Text>
						{renderField("Company Name", "companyName", {
							icon: "business-outline",
							placeholder: "Acme Towing Inc.",
						})}
						{renderField("Service Area", "serviceArea", {
							icon: "map-outline",
							placeholder: "Greater Toronto Area",
						})}
						{renderField("Driver License Number", "licenseNumber", {
							icon: "id-card-outline",
							autoCapitalize: "characters",
							placeholder: "A12345678",
						})}
						{renderField("Vehicle Type", "vehicleType", {
							icon: "car-sport-outline",
							placeholder: "Flatbed Tow Truck",
						})}
						{renderField("Insurance Number (Optional)", "insuranceNumber", {
							icon: "shield-checkmark-outline",
							autoCapitalize: "characters",
							placeholder: "Optional",
						})}
					</View>
				);

			// ── Step 3: Password ──────────────────────────────────────────────
			case 3:
				return (
					<View>
						<Text style={[styles.stepTitle, { color: colors.text }]}>
							Secure Your Account
						</Text>
						<Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
							Create a strong password
						</Text>
						{renderField("Password", "password", {
							icon: "lock-closed-outline",
							secure: true,
							showToggle: true,
							showState: showPass,
							onToggle: () => setShowPass(v => !v),
							autoCapitalize: "none",
							placeholder: "Minimum 8 characters",
						})}
						{renderField("Confirm Password", "confirmPassword", {
							icon: "lock-closed-outline",
							secure: true,
							showToggle: true,
							showState: showConfirm,
							onToggle: () => setShowConfirm(v => !v),
							autoCapitalize: "none",
							placeholder: "Re-enter password",
						})}

						{/* Password strength hint */}
						{form.password.length > 0 && (
							<View
								style={[
									styles.strengthRow,
									{
										backgroundColor: isDarkMode
											? "rgba(255,255,255,0.04)"
											: "rgba(27,25,22,0.04)",
										borderColor: divider,
									},
								]}
							>
								{[8, 10, 12].map((len, i) => (
									<View
										key={len}
										style={[
											styles.strengthBar,
											{
												backgroundColor:
													form.password.length >= len
														? i === 0
															? colors.danger
															: i === 1
																? colors.amber
																: colors.green
														: isDarkMode
															? "rgba(255,255,255,0.10)"
															: "#E2DDD6",
											},
										]}
									/>
								))}
								<Text style={[styles.strengthLabel, { color: colors.textMuted }]}>
									{form.password.length < 8
										? "Too short"
										: form.password.length < 10
											? "Weak"
											: form.password.length < 12
												? "Good"
												: "Strong"}
								</Text>
							</View>
						)}
					</View>
				);

			default:
				return null;
		}
	};

	// ── Progress bar ──────────────────────────────────────────────────────────
	const progress = step / (totalSteps - 1);

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<SafeAreaView style={styles.safeArea}>
				{/* ── Top bar ── */}
				<View
					style={[
						styles.topBar,
						{ borderBottomColor: colors.border, backgroundColor: colors.card },
					]}
				>
					<TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
						<View
							style={[
								styles.backIconWrap,
								{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#EDE9E2" },
							]}
						>
							<Ionicons name="chevron-back" size={18} color={colors.text} />
						</View>
					</TouchableOpacity>

					<View style={styles.topMid}>
						<Text style={[styles.topLabel, { color: colors.textMuted }]}>
							Step {step + 1} of {totalSteps}
						</Text>
						<Text style={[styles.topTitle, { color: colors.text }]}>{steps[step]}</Text>
					</View>

					{/* Dot stepper */}
					<View style={styles.dotRow}>
						{steps.map((_, i) => (
							<View
								key={i}
								style={[
									styles.dot,
									{
										backgroundColor:
											i <= step
												? colors.primary
												: isDarkMode
													? "rgba(255,255,255,0.15)"
													: "#D4CFC8",
										width: i === step ? 18 : 6,
									},
								]}
							/>
						))}
					</View>
				</View>

				{/* Progress bar */}
				<View
					style={[
						styles.progressTrack,
						{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#E2DDD6" },
					]}
				>
					<Animated.View
						style={[
							styles.progressFill,
							{ backgroundColor: colors.primary, width: `${progress * 100}%` },
						]}
					/>
				</View>

				{/* ── Scrollable content ── */}
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Animated.View
							style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
						>
							{renderStep()}
						</Animated.View>
					</ScrollView>

					{/* ── Footer CTA ── */}
					<View
						style={[
							styles.footer,
							{ backgroundColor: colors.card, borderTopColor: colors.border },
						]}
					>
						{step < totalSteps - 1 ? (
							<PrimaryButton
								title={`Continue — ${steps[step + 1]}`}
								onPress={goNext}
								disabled={!isStepValid(step)}
							/>
						) : (
							<PrimaryButton
								title="Create Account"
								onPress={handleRegister}
								isLoading={isSubmitting}
								disabled={!isFormValid || isSubmitting}
							/>
						)}

						{step === 0 && (
							<TouchableOpacity
								style={styles.loginLink}
								onPress={() => navigation.goBack()}
								activeOpacity={0.7}
							>
								<Text style={[styles.loginLinkText, { color: colors.textMuted }]}>
									Already have an account?{" "}
									<Text style={{ color: colors.primary, fontWeight: "700" }}>
										Sign In
									</Text>
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</View>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1 },
	safeArea: { flex: 1 },

	// Top bar
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	backBtn: { marginRight: 12 },
	backIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	topMid: { flex: 1 },
	topLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 1 },
	topTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
	dotRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	dot: { height: 6, borderRadius: 3 },

	// Progress bar
	progressTrack: { height: 2 },
	progressFill: { height: 2 },

	// Content
	scrollContent: { padding: 24, paddingBottom: 16 },

	// Step typography
	stepTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
	stepSubtitle: { fontSize: 14, marginBottom: 28, lineHeight: 20 },

	// Role cards
	roleGrid: { gap: 12 },
	roleCard: {
		borderRadius: 20,
		borderWidth: 1.5,
		padding: 20,
		position: "relative",
	},
	roleCheck: {
		position: "absolute",
		top: 14,
		right: 14,
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	roleIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
	},
	roleTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6, letterSpacing: -0.2 },
	roleDesc: { fontSize: 13, lineHeight: 18 },

	// Fields
	fieldGroup: { marginBottom: 16 },
	fieldLabel: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 8,
		textTransform: "uppercase",
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
	},
	fieldIcon: { marginRight: 10 },
	input: { flex: 1, fontSize: 15, paddingVertical: 0 },
	errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
	errorText: { fontSize: 12 },

	// Two-col layout
	twoCol: { flexDirection: "row", gap: 12 },
	colHalf: { flex: 1 },

	// Password strength
	strengthRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 4,
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
	},
	strengthBar: { flex: 1, height: 4, borderRadius: 2 },
	strengthLabel: { fontSize: 11, fontWeight: "600", minWidth: 45, textAlign: "right" },

	// Footer
	footer: {
		padding: 16,
		paddingBottom: Platform.OS === "ios" ? 8 : 16,
		borderTopWidth: 1,
	},
	loginLink: { alignItems: "center", paddingTop: 14 },
	loginLinkText: { fontSize: 14 },
});
