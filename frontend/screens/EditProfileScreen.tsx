import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	TouchableOpacity,
	Modal,
	ActivityIndicator,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

// ─────────────────────────────────────────────────────────────────────────────
// OTP verification modal
// ─────────────────────────────────────────────────────────────────────────────
interface OtpModalProps {
	visible: boolean;
	type: "phone" | "email";
	newValue: string;
	onSuccess: (type: "phone" | "email", newValue: string) => void;
	onDismiss: () => void;
	colors: any;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

const OtpModal: React.FC<OtpModalProps> = ({
	visible,
	type,
	newValue,
	onSuccess,
	onDismiss,
	colors,
}) => {
	const [otp, setOtp] = useState("");
	const [loading, setLoading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
	const [error, setError] = useState("");
	const inputRef = useRef<TextInput>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const shakeAnim = useRef(new Animated.Value(0)).current;

	// Start resend cooldown when modal opens
	useEffect(() => {
		if (visible) {
			setOtp("");
			setError("");
			setResendCooldown(RESEND_COOLDOWN);
			startCountdown();
			setTimeout(() => inputRef.current?.focus(), 300);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [visible]);

	const startCountdown = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		setResendCooldown(RESEND_COOLDOWN);
		timerRef.current = setInterval(() => {
			setResendCooldown(prev => {
				if (prev <= 1) {
					clearInterval(timerRef.current!);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const shake = () => {
		Animated.sequence([
			Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
		]).start();
	};

	const handleVerify = async () => {
		if (otp.length !== OTP_LENGTH) return;
		setLoading(true);
		setError("");
		try {
			const endpoint =
				type === "phone" ? "/users/verify-phone-change" : "/users/verify-email-change";
			await api.post(endpoint, { code: otp });
			onSuccess(type, newValue);
		} catch (e: any) {
			const msg = e?.response?.data?.message || "Incorrect code. Please try again.";
			setError(msg);
			setOtp("");
			shake();
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (resendCooldown > 0) return;
		try {
			const endpoint =
				type === "phone" ? "/users/request-phone-change" : "/users/request-email-change";
			const payload = type === "phone" ? { newPhone: newValue } : { newEmail: newValue };
			await api.post(endpoint, payload);
			startCountdown();
			setError("");
			setOtp("");
		} catch (e: any) {
			setError(e?.response?.data?.message || "Failed to resend. Please try again.");
		}
	};

	// Auto-submit when all digits entered
	useEffect(() => {
		if (otp.length === OTP_LENGTH) {
			handleVerify();
		}
	}, [otp]);

	const maskedValue =
		type === "phone"
			? newValue.replace(/(\d{3})\d+(\d{3})/, "$1•••$2")
			: newValue.replace(/(.{2})(.*)(@.*)/, "$1•••$3");

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			presentationStyle="overFullScreen"
		>
			<View style={otpStyles.backdrop}>
				<TouchableOpacity
					style={StyleSheet.absoluteFill}
					onPress={onDismiss}
					activeOpacity={1}
				/>
				<View style={[otpStyles.sheet, { backgroundColor: colors.card }]}>
					{/* Handle */}
					<View style={[otpStyles.handle, { backgroundColor: colors.border }]} />

					{/* Icon */}
					<View style={[otpStyles.iconWrap, { backgroundColor: colors.accentBg }]}>
						<Ionicons
							name={type === "phone" ? "phone-portrait-outline" : "mail-outline"}
							size={28}
							color={colors.primary}
						/>
					</View>

					<Text style={[otpStyles.title, { color: colors.text }]}>
						Verify your {type === "phone" ? "phone number" : "email"}
					</Text>
					<Text style={[otpStyles.subtitle, { color: colors.textMuted }]}>
						We sent a 6-digit code to{"\n"}
						<Text style={{ color: colors.text, fontWeight: "700" }}>{maskedValue}</Text>
					</Text>

					{/* OTP box display */}
					<Animated.View
						style={[otpStyles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
					>
						{Array.from({ length: OTP_LENGTH }).map((_, i) => {
							const digit = otp[i];
							const isFocused = otp.length === i;
							return (
								<View
									key={i}
									style={[
										otpStyles.otpBox,
										{
											borderColor: error
												? colors.danger
												: isFocused
													? colors.primary
													: digit
														? colors.primary + "60"
														: colors.border,
											backgroundColor: colors.background,
										},
									]}
								>
									<Text style={[otpStyles.otpDigit, { color: colors.text }]}>
										{digit || ""}
									</Text>
								</View>
							);
						})}
					</Animated.View>

					{/* Hidden input captures keystrokes */}
					<TextInput
						ref={inputRef}
						style={otpStyles.hiddenInput}
						value={otp}
						onChangeText={val => {
							if (/^\d*$/.test(val) && val.length <= OTP_LENGTH) {
								setOtp(val);
								setError("");
							}
						}}
						keyboardType="number-pad"
						maxLength={OTP_LENGTH}
						autoFocus
					/>

					{error ? (
						<Text style={[otpStyles.errorText, { color: colors.danger }]}>{error}</Text>
					) : null}

					{loading && (
						<ActivityIndicator
							style={{ marginTop: 8 }}
							size="small"
							color={colors.primary}
						/>
					)}

					{/* Resend */}
					<TouchableOpacity
						onPress={handleResend}
						disabled={resendCooldown > 0}
						style={otpStyles.resendBtn}
					>
						<Text
							style={[
								otpStyles.resendText,
								{ color: resendCooldown > 0 ? colors.textMuted : colors.primary },
							]}
						>
							{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
						</Text>
					</TouchableOpacity>

					{/* Cancel */}
					<TouchableOpacity onPress={onDismiss} style={otpStyles.cancelBtn}>
						<Text style={[otpStyles.cancelText, { color: colors.textMuted }]}>
							Cancel
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// VerifyThen — row with value + "Change" button for sensitive fields
// ─────────────────────────────────────────────────────────────────────────────
interface VerifyThenRowProps {
	label: string;
	value: string;
	pendingValue?: string;
	onChangePress: () => void;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	colors: any;
}

const VerifyThenRow: React.FC<VerifyThenRowProps> = ({
	label,
	value,
	pendingValue,
	onChangePress,
	icon,
	colors,
}) => (
	<View style={fieldStyles.verifyRow}>
		<View style={[fieldStyles.verifyIcon, { backgroundColor: colors.accentBg }]}>
			<Ionicons name={icon} size={16} color={colors.primary} />
		</View>
		<View style={{ flex: 1 }}>
			<Text style={[fieldStyles.verifyLabel, { color: colors.textMuted }]}>{label}</Text>
			<Text style={[fieldStyles.verifyValue, { color: colors.text }]}>
				{pendingValue ?? value ?? "Not set"}
			</Text>
			{pendingValue && (
				<Text style={[fieldStyles.pendingNote, { color: colors.textMuted }]}>
					Pending verification
				</Text>
			)}
		</View>
		<TouchableOpacity
			style={[fieldStyles.changeBtn, { borderColor: colors.border }]}
			onPress={onChangePress}
			activeOpacity={0.7}
		>
			<Text style={[fieldStyles.changeBtnText, { color: colors.primary }]}>Change</Text>
		</TouchableOpacity>
	</View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Change contact modal — enter new phone/email before sending OTP
// ─────────────────────────────────────────────────────────────────────────────
interface ChangeContactModalProps {
	visible: boolean;
	type: "phone" | "email";
	onSend: (newValue: string) => void;
	onDismiss: () => void;
	colors: any;
	isDarkMode: boolean;
}

const ChangeContactModal: React.FC<ChangeContactModalProps> = ({
	visible,
	type,
	onSend,
	onDismiss,
	colors,
	isDarkMode,
}) => {
	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (visible) {
			setValue("");
			setError("");
		}
	}, [visible]);

	const isPhone = type === "phone";
	const isValid = isPhone
		? /^\+?[\d\s\-().]{7,15}$/.test(value.trim())
		: /\S+@\S+\.\S+/.test(value.trim());

	const handleSend = async () => {
		if (!isValid) return;
		setLoading(true);
		setError("");
		try {
			const endpoint = isPhone
				? "/users/request-phone-change"
				: "/users/request-email-change";
			const payload = isPhone ? { newPhone: value.trim() } : { newEmail: value.trim() };
			await api.post(endpoint, payload);
			onSend(value.trim());
		} catch (e: any) {
			setError(e?.response?.data?.message || "Failed to send code. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			presentationStyle="overFullScreen"
		>
			<KeyboardAvoidingView
				style={otpStyles.kavWrapper}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={0}
			>
				<TouchableOpacity
					style={otpStyles.backdropTap}
					onPress={onDismiss}
					activeOpacity={1}
				/>
				<View style={[otpStyles.sheet, { backgroundColor: colors.card }]}>
					<View style={[otpStyles.handle, { backgroundColor: colors.border }]} />

					<Text style={[otpStyles.title, { color: colors.text }]}>
						Change {isPhone ? "Phone Number" : "Email Address"}
					</Text>
					<Text style={[otpStyles.subtitle, { color: colors.textMuted }]}>
						Enter your new {isPhone ? "phone number" : "email"} and we'll send a
						verification code to confirm.
					</Text>

					<View
						style={[
							fieldStyles.inputWrapper,
							{
								borderColor: error ? colors.danger : colors.border,
								backgroundColor: colors.background,
							},
						]}
					>
						<Ionicons
							name={isPhone ? "phone-portrait-outline" : "mail-outline"}
							size={18}
							color={colors.textMuted}
							style={{ marginRight: 10 }}
						/>
						<TextInput
							style={[fieldStyles.input, { color: colors.text }]}
							value={value}
							onChangeText={v => {
								setValue(v);
								setError("");
							}}
							keyboardType={isPhone ? "phone-pad" : "email-address"}
							autoCapitalize="none"
							autoFocus
							placeholder={isPhone ? "+1 416 000 0000" : "you@example.com"}
							placeholderTextColor={colors.textMuted}
						/>
					</View>

					{error ? (
						<Text style={[{ color: colors.danger, fontSize: 13, marginTop: 6 }]}>
							{error}
						</Text>
					) : null}

					<View style={{ gap: 10, marginTop: 20 }}>
						<PrimaryButton
							title={loading ? "Sending…" : "Send Verification Code"}
							onPress={handleSend}
							disabled={!isValid || loading}
						/>
						<TouchableOpacity onPress={onDismiss} style={otpStyles.cancelBtn}>
							<Text style={[otpStyles.cancelText, { color: colors.textMuted }]}>
								Cancel
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export const EditProfileScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { user, setUser } = useAuth();
	const { showToast } = useToast();
	const navigation = useNavigation<any>();

	// ── Form state ─────────────────────────────────────────────────────────
	const [form, setForm] = useState({
		name: "",
		companyName: "",
		serviceArea: "",
		licenseNumber: "",
		vehicleType: "",
		insuranceNumber: "",
	});

	// ── OTP / change modal state ───────────────────────────────────────────
	const [changeContactType, setChangeContactType] = useState<"phone" | "email" | null>(
		null,
	);
	const [pendingNewValue, setPendingNewValue] = useState<string | null>(null);
	const [showOtpModal, setShowOtpModal] = useState(false);
	const [showChangeModal, setShowChangeModal] = useState(false);

	// ── Submit state ───────────────────────────────────────────────────────
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ── Populate form from user ────────────────────────────────────────────
	useEffect(() => {
		if (user) {
			setForm({
				name: user.name || "",
				companyName: user.driverProfile?.companyName || "",
				serviceArea: user.driverProfile?.serviceArea || "",
				licenseNumber: user.driverProfile?.licenseNumber || "",
				vehicleType: user.driverProfile?.vehicleType || "",
				insuranceNumber: user.driverProfile?.insuranceNumber || "",
			});
		}
	}, [user]);

	// ── Validation ────────────────────────────────────────────────────────
	const errors: Partial<typeof form> = {};
	if (!form.name.trim() || form.name.trim().length < 2) {
		errors.name = "Full name must be at least 2 characters";
	}
	if (user?.role === "DRIVER") {
		if (!form.companyName.trim()) errors.companyName = "Required";
		if (!form.serviceArea.trim()) errors.serviceArea = "Required";
		if (!form.licenseNumber.trim()) errors.licenseNumber = "Required";
		if (!form.vehicleType.trim()) errors.vehicleType = "Required";
	}
	const isFormValid = Object.keys(errors).length === 0;

	// Detect changes vs current user
	const hasChanges =
		form.name !== (user?.name || "") ||
		form.companyName !== (user?.driverProfile?.companyName || "") ||
		form.serviceArea !== (user?.driverProfile?.serviceArea || "") ||
		form.licenseNumber !== (user?.driverProfile?.licenseNumber || "") ||
		form.vehicleType !== (user?.driverProfile?.vehicleType || "") ||
		form.insuranceNumber !== (user?.driverProfile?.insuranceNumber || "");

	// ── Input helper ──────────────────────────────────────────────────────
	const renderField = (
		label: string,
		field: keyof typeof form,
		opts: {
			keyboard?: any;
			autoCapitalize?: any;
			optional?: boolean;
		} = {},
	) => {
		const err = errors[field];
		const dirty = form[field] !== "";
		return (
			<View style={styles.fieldWrap}>
				<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
					{label.toUpperCase()}
					{opts.optional && (
						<Text style={{ fontSize: 10, fontWeight: "400" }}> (OPTIONAL)</Text>
					)}
				</Text>
				<View
					style={[
						styles.inputRow,
						{
							borderColor: err && dirty ? colors.danger : colors.border,
							backgroundColor: isDarkMode ? colors.surface : colors.background,
						},
					]}
				>
					<TextInput
						style={[styles.textInput, { color: colors.text }]}
						value={form[field]}
						onChangeText={val => setForm(prev => ({ ...prev, [field]: val }))}
						keyboardType={opts.keyboard ?? "default"}
						autoCapitalize={opts.autoCapitalize ?? "words"}
						placeholderTextColor={colors.textMuted}
					/>
				</View>
				{err && dirty && (
					<Text style={[styles.fieldError, { color: colors.danger }]}>{err}</Text>
				)}
			</View>
		);
	};

	// ── Save ──────────────────────────────────────────────────────────────
	const handleSave = async () => {
		if (!isFormValid || !hasChanges || isSubmitting) return;
		setIsSubmitting(true);
		try {
			const res = await api.put<any>("/users/profile", {
				name: form.name.trim(),
				companyName: form.companyName.trim(),
				serviceArea: form.serviceArea.trim(),
				licenseNumber: form.licenseNumber.trim(),
				vehicleType: form.vehicleType.trim(),
				insuranceNumber: form.insuranceNumber.trim(),
			});

			if (res.data.success) {
				// Merge returned user into auth context + AsyncStorage
				const updated = {
					...user!,
					name: form.name.trim(),
					driverProfile:
						user?.role === "DRIVER"
							? {
									...user?.driverProfile,
									companyName: form.companyName.trim(),
									serviceArea: form.serviceArea.trim(),
									licenseNumber: form.licenseNumber.trim(),
									vehicleType: form.vehicleType.trim(),
									insuranceNumber: form.insuranceNumber.trim(),
								}
							: user?.driverProfile,
				};
				setUser(updated);
				showToast("Profile updated!", "success");
				navigation.goBack();
			}
		} catch (e: any) {
			showToast(e?.response?.data?.message || "Failed to save changes", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// ── OTP flow handlers ─────────────────────────────────────────────────
	const openChangeModal = (type: "phone" | "email") => {
		setChangeContactType(type);
		setShowChangeModal(true);
	};

	const handleCodeSent = (newValue: string) => {
		setPendingNewValue(newValue);
		setShowChangeModal(false);
		// Small delay so change modal fully dismisses before OTP opens
		setTimeout(() => setShowOtpModal(true), 350);
	};

	const handleOtpSuccess = (type: "phone" | "email", newValue: string) => {
		setShowOtpModal(false);
		setPendingNewValue(null);

		const updated =
			type === "phone" ? { ...user!, phone: newValue } : { ...user!, email: newValue };
		setUser(updated);
		showToast(
			type === "phone" ? "Phone number updated!" : "Email address updated!",
			"success",
		);
	};

	// ─────────────────────────────────────────────────────────────────────
	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["bottom", "left", "right"]}
		>
			{/* ── Change contact modal (enter new value) ── */}
			{changeContactType && (
				<ChangeContactModal
					visible={showChangeModal}
					type={changeContactType}
					onSend={handleCodeSent}
					onDismiss={() => setShowChangeModal(false)}
					colors={colors}
					isDarkMode={isDarkMode}
				/>
			)}

			{/* ── OTP verification modal ── */}
			{changeContactType && pendingNewValue && (
				<OtpModal
					visible={showOtpModal}
					type={changeContactType}
					newValue={pendingNewValue}
					onSuccess={handleOtpSuccess}
					onDismiss={() => {
						setShowOtpModal(false);
						setPendingNewValue(null);
					}}
					colors={colors}
				/>
			)}

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* ── Personal Info ── */}
					<Card style={styles.card}>
						<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
							PERSONAL INFO
						</Text>

						{/* Name — directly editable */}
						{renderField("Full Name", "name")}

						{/* Phone — change via OTP */}
						<VerifyThenRow
							label="Phone Number"
							value={user?.phone || ""}
							onChangePress={() => openChangeModal("phone")}
							icon="phone-portrait-outline"
							colors={colors}
						/>

						{/* Email — change via OTP */}
						<VerifyThenRow
							label="Email Address"
							value={user?.email || ""}
							onChangePress={() => openChangeModal("email")}
							icon="mail-outline"
							colors={colors}
						/>
					</Card>

					{/* ── Driver Profile ── */}
					{user?.role === "DRIVER" && (
						<Card style={styles.card}>
							<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
								DRIVER PROFILE
							</Text>
							{renderField("Company Name", "companyName")}
							{renderField("Service Area", "serviceArea")}
							{renderField("License Number", "licenseNumber", {
								autoCapitalize: "characters",
							})}
							{renderField("Vehicle Type", "vehicleType")}
							{renderField("Insurance Number", "insuranceNumber", {
								autoCapitalize: "characters",
								optional: true,
							})}
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1 },
	scrollContent: { padding: 16, paddingBottom: 40 },

	card: { padding: 18, marginBottom: 16 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 16,
	},

	fieldWrap: { marginBottom: 16 },
	fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 7 },
	inputRow: {
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
		flexDirection: "row",
		alignItems: "center",
	},
	textInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
	fieldError: { fontSize: 12, marginTop: 5, marginLeft: 2 },

	footer: { marginTop: 8 },
});

const fieldStyles = StyleSheet.create({
	verifyRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
	},
	verifyIcon: {
		width: 38,
		height: 38,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
	},
	verifyLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4, marginBottom: 2 },
	verifyValue: { fontSize: 15, fontWeight: "500" },
	pendingNote: { fontSize: 11, marginTop: 2 },
	changeBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 10,
		borderWidth: 1,
	},
	changeBtnText: { fontSize: 13, fontWeight: "700" },
	inputWrapper: {
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
		flexDirection: "row",
		alignItems: "center",
	},
	input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});

const otpStyles = StyleSheet.create({
	kavWrapper: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.55)",
	},
	backdropTap: {
		...StyleSheet.absoluteFillObject,
	},
	sheet: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		padding: 28,
		paddingBottom: Platform.OS === "android" ? 24 : 40,
		alignItems: "center",
		gap: 8,
	},
	handle: {
		width: 38,
		height: 4,
		borderRadius: 2,
		marginBottom: 16,
	},
	iconWrap: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
	subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 8 },

	otpRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 16,
		marginBottom: 4,
	},
	otpBox: {
		width: 46,
		height: 56,
		borderRadius: 14,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	otpDigit: { fontSize: 24, fontWeight: "700" },

	hiddenInput: {
		position: "absolute",
		opacity: 0,
		width: 1,
		height: 1,
	},

	errorText: { fontSize: 13, textAlign: "center" },

	resendBtn: { marginTop: 16 },
	resendText: { fontSize: 14, fontWeight: "600" },

	cancelBtn: { marginTop: 4, paddingVertical: 8 },
	cancelText: { fontSize: 14 },
});
