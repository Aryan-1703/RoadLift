import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	TextInput,
	Animated,
	KeyboardAvoidingView,
	Platform,
	Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "./PrimaryButton";

export interface ThirdPartyInfo {
	name: string;
	phone: string;
}

interface Props {
	visible: boolean;
	onIWillBeThere: () => void;
	onThirdParty: (info: ThirdPartyInfo) => void;
	onDismiss: () => void;
	colors: any;
	isDarkMode: boolean;
}

type SheetView = "choice" | "form";

export const WhoWillBeThereSheet: React.FC<Props> = ({
	visible,
	onIWillBeThere,
	onThirdParty,
	onDismiss,
	colors,
	isDarkMode,
}) => {
	const insets = useSafeAreaInsets();

	const [view,         setView]         = useState<SheetView>("choice");
	const [name,         setName]         = useState("");
	const [phone,        setPhone]        = useState("");
	const [nameError,    setNameError]    = useState("");
	const [phoneError,   setPhoneError]   = useState("");
	const [nameFocused,  setNameFocused]  = useState(false);
	const [phoneFocused, setPhoneFocused] = useState(false);

	const fadeAnim = useRef(new Animated.Value(1)).current;

	// Reset internal state whenever the sheet closes
	useEffect(() => {
		if (!visible) {
			const t = setTimeout(() => {
				setView("choice");
				setName("");
				setPhone("");
				setNameError("");
				setPhoneError("");
			}, 350);
			return () => clearTimeout(t);
		}
	}, [visible]);

	const switchView = (target: SheetView) => {
		Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
			setView(target);
			Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
		});
	};

	const validate = (): boolean => {
		let valid = true;
		if (!name.trim() || name.trim().length < 2) {
			setNameError("Please enter a valid name");
			valid = false;
		} else {
			setNameError("");
		}
		const digits = phone.replace(/\D/g, "");
		if (digits.length < 10) {
			setPhoneError("Please enter a valid 10-digit phone number");
			valid = false;
		} else {
			setPhoneError("");
		}
		return valid;
	};

	const handleConfirm = () => {
		if (!validate()) return;
		onThirdParty({ name: name.trim(), phone: phone.trim() });
	};

	// Derived colours
	const cardBg      = isDarkMode ? "#0d1424" : "#FFFFFF";
	const cardBorder  = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";
	const inputBg     = isDarkMode ? "#0a1020" : "#F7F4EF";
	const inputBorder = isDarkMode ? "rgba(255,255,255,0.10)" : "#D4CFC8";
	const handleColor = isDarkMode ? "rgba(255,255,255,0.18)" : "#D4CFC8";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onDismiss}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.kav}
			>
				<Pressable style={styles.overlay} onPress={onDismiss} />

				<View
					style={[
						styles.sheet,
						{
							backgroundColor: cardBg,
							borderColor:     cardBorder,
							paddingBottom:   Math.max(insets.bottom, 16) + 16,
						},
					]}
				>
					{/* Drag handle */}
					<View style={[styles.handle, { backgroundColor: handleColor }]} />

					<Animated.View style={{ opacity: fadeAnim }}>
						{view === "choice" ? (
							// ── Choice view ──────────────────────────────────────────
							<>
								<Text style={[styles.title, { color: colors.text }]}>
									Who will be at the vehicle?
								</Text>
								<Text style={[styles.subtitle, { color: colors.textMuted }]}>
									Help us connect the driver to the right person
								</Text>

								{/* I will be there */}
								<TouchableOpacity
									style={[
										styles.optionCard,
										{
											backgroundColor: isDarkMode
												? "rgba(26,107,255,0.08)"
												: "rgba(26,107,255,0.04)",
											borderColor: colors.primary,
										},
									]}
									onPress={onIWillBeThere}
									activeOpacity={0.8}
								>
									<View style={[styles.optionIcon, { backgroundColor: colors.primary + "20" }]}>
										<Ionicons name="person" size={22} color={colors.primary} />
									</View>
									<View style={styles.optionText}>
										<Text style={[styles.optionTitle, { color: colors.text }]}>
											I will be there
										</Text>
										<Text style={[styles.optionDesc, { color: colors.textMuted }]}>
											Proceed with normal flow
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={18} color={colors.primary} />
								</TouchableOpacity>

								{/* Someone else */}
								<TouchableOpacity
									style={[
										styles.optionCard,
										{
											backgroundColor: isDarkMode
												? "rgba(255,255,255,0.03)"
												: "rgba(0,0,0,0.02)",
											borderColor: cardBorder,
										},
									]}
									onPress={() => switchView("form")}
									activeOpacity={0.8}
								>
									<View style={[styles.optionIcon, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#EDE9E2" }]}>
										<Ionicons name="people" size={22} color={colors.textMuted} />
									</View>
									<View style={styles.optionText}>
										<Text style={[styles.optionTitle, { color: colors.text }]}>
											Someone else will be there
										</Text>
										<Text style={[styles.optionDesc, { color: colors.textMuted }]}>
											Enter their contact details
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
								</TouchableOpacity>
							</>
						) : (
							// ── Form view ────────────────────────────────────────────
							<>
								<View style={styles.formHeader}>
									<TouchableOpacity
										style={[styles.backBtn, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#EDE9E2" }]}
										onPress={() => switchView("choice")}
										activeOpacity={0.7}
									>
										<Ionicons name="chevron-back" size={18} color={colors.text} />
									</TouchableOpacity>
									<View style={{ flex: 1 }}>
										<Text style={[styles.title, { color: colors.text, marginBottom: 2 }]}>
											Contact Details
										</Text>
										<Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 0 }]}>
											Who should the driver call on arrival?
										</Text>
									</View>
								</View>

								{/* Name input */}
								<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
									THEIR NAME
								</Text>
								<View
									style={[
										styles.inputWrap,
										{
											backgroundColor: inputBg,
											borderColor:     nameError
												? colors.danger
												: nameFocused ? colors.primary : inputBorder,
											shadowColor:   colors.primary,
											shadowOpacity: nameFocused ? 0.15 : 0,
										},
									]}
								>
									<Ionicons
										name="person-outline"
										size={17}
										color={nameFocused ? colors.primary : colors.textMuted}
										style={styles.inputIcon}
									/>
									<TextInput
										style={[styles.input, { color: colors.text }]}
										value={name}
										onChangeText={t => { setName(t); if (nameError) setNameError(""); }}
										placeholder="Full name"
										placeholderTextColor={colors.textMuted}
										autoCapitalize="words"
										returnKeyType="next"
										onFocus={() => setNameFocused(true)}
										onBlur={() => setNameFocused(false)}
									/>
								</View>
								{!!nameError && (
									<Text style={[styles.errorText, { color: colors.danger }]}>
										{nameError}
									</Text>
								)}

								{/* Phone input */}
								<Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 16 }]}>
									THEIR PHONE NUMBER
								</Text>
								<View
									style={[
										styles.inputWrap,
										{
											backgroundColor: inputBg,
											borderColor:     phoneError
												? colors.danger
												: phoneFocused ? colors.primary : inputBorder,
											shadowColor:   colors.primary,
											shadowOpacity: phoneFocused ? 0.15 : 0,
										},
									]}
								>
									<Ionicons
										name="call-outline"
										size={17}
										color={phoneFocused ? colors.primary : colors.textMuted}
										style={styles.inputIcon}
									/>
									<TextInput
										style={[styles.input, { color: colors.text }]}
										value={phone}
										onChangeText={t => { setPhone(t); if (phoneError) setPhoneError(""); }}
										placeholder="Phone number"
										placeholderTextColor={colors.textMuted}
										keyboardType="phone-pad"
										returnKeyType="done"
										onFocus={() => setPhoneFocused(true)}
										onBlur={() => setPhoneFocused(false)}
										onSubmitEditing={handleConfirm}
									/>
								</View>
								{!!phoneError && (
									<Text style={[styles.errorText, { color: colors.danger }]}>
										{phoneError}
									</Text>
								)}

								<PrimaryButton
									title="Confirm & Continue"
									onPress={handleConfirm}
									style={{ marginTop: 24 }}
								/>
							</>
						)}
					</Animated.View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	kav:     { flex: 1, justifyContent: "flex-end" },
	overlay: { flex: 1 },

	sheet: {
		borderTopLeftRadius:  28,
		borderTopRightRadius: 28,
		borderTopWidth: 1,
		paddingHorizontal: 24,
		paddingTop: 12,
	},
	handle: {
		width: 40, height: 4, borderRadius: 2,
		alignSelf: "center", marginBottom: 22,
	},

	title:    { fontSize: 21, fontWeight: "800", letterSpacing: -0.4, marginBottom: 6 },
	subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 24 },

	// Option cards
	optionCard: {
		flexDirection: "row", alignItems: "center",
		borderRadius: 18, borderWidth: 1.5,
		padding: 16, marginBottom: 12, gap: 14,
	},
	optionIcon: {
		width: 46, height: 46, borderRadius: 13,
		alignItems: "center", justifyContent: "center",
	},
	optionText:  { flex: 1 },
	optionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
	optionDesc:  { fontSize: 12 },

	// Form header
	formHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 24 },
	backBtn:    { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 3 },

	// Fields
	fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
	inputWrap:  {
		flexDirection: "row", alignItems: "center",
		borderWidth: 1.5, borderRadius: 14,
		paddingHorizontal: 14, paddingVertical: 13,
		shadowOffset: { width: 0, height: 0 }, shadowRadius: 8,
	},
	inputIcon: { marginRight: 10 },
	input:     { flex: 1, fontSize: 15, paddingVertical: 0 },
	errorText: { fontSize: 12, fontWeight: "500", marginTop: 6, marginLeft: 2 },
});
