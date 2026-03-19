import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	TouchableOpacity,
	Animated,
	StatusBar,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config";

export const LoginScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { login, getRememberedEmail } = useAuth();
	const navigation = useNavigation<any>();

	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [rememberEmail, setRememberEmail] = useState(false);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [phoneFocused, setPhoneFocused] = useState(false);
	const [passFocused, setPassFocused] = useState(false);

	// Entrance animations
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(32)).current;
	const logoAnim = useRef(new Animated.Value(0)).current;
	const logoScale = useRef(new Animated.Value(0.85)).current;

	useEffect(() => {
		Animated.sequence([
			Animated.parallel([
				Animated.spring(logoScale, {
					toValue: 1,
					tension: 60,
					friction: 8,
					useNativeDriver: true,
				}),
				Animated.timing(logoAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
			]),
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 50,
					friction: 10,
					useNativeDriver: true,
				}),
			]),
		]).start();
	}, []);

	useEffect(() => {
		const load = async () => {
			const remembered = await getRememberedEmail();
			if (remembered) {
				setPhoneNumber(remembered);
				setRememberEmail(true);
			}
		};
		load();
	}, [getRememberedEmail]);

	const handleLogin = async () => {
		if (!phoneNumber) {
			setError("Phone number is required");
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
					? `Network Error: Cannot reach backend at ${API_URL}.\n\nIf testing on a physical device, enter your Wi-Fi IP in frontend/config.ts`
					: err.message;
			setError(backendError || fallbackError || "Failed to login");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Theme tokens
	const screenBg = isDarkMode ? "#060b18" : "#F0EDE7";
	const cardBg = isDarkMode ? "#0d1424" : "#FFFFFF";
	const cardBorder = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";
	const inputBg = isDarkMode ? "#0a1020" : "#F7F4EF";
	const inputBorder = isDarkMode ? "rgba(255,255,255,0.10)" : "#D4CFC8";
	const logoBg = isDarkMode ? "rgba(26,107,255,0.15)" : "rgba(26,107,255,0.09)";
	const logoRing = isDarkMode ? "rgba(26,107,255,0.30)" : "rgba(26,107,255,0.18)";
	const dividerColor = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";
	const taglineBg = isDarkMode ? "rgba(26,107,255,0.12)" : "rgba(26,107,255,0.07)";
	const bgShapeColor = isDarkMode ? "rgba(26,107,255,0.04)" : "rgba(26,107,255,0.045)";

	return (
		<View style={[styles.root, { backgroundColor: screenBg }]}>
			<StatusBar
				barStyle={isDarkMode ? "light-content" : "dark-content"}
				backgroundColor={screenBg}
			/>

			{/* Decorative circle — behind everything */}
			<View
				style={[styles.bgShape, { backgroundColor: bgShapeColor }]}
				pointerEvents="none"
			/>

			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.kav}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
				>
					{/*
					 * FIX: Use ScrollView + contentContainerStyle flexGrow/justifyCenter
					 * instead of a plain View with justifyContent: "center".
					 *
					 * When the keyboard opens, a plain centered View collapses its height
					 * which steals focus from the TextInput. A ScrollView grows to fit
					 * the content and scrolls instead, keeping inputs mounted & focused.
					 *
					 * keyboardShouldPersistTaps="handled" ensures taps on buttons inside
					 * the scroll view work without first dismissing the keyboard.
					 */}
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						bounces={false}
					>
						{/* ── Logo ── */}
						<Animated.View
							style={[
								styles.logoSection,
								{ opacity: logoAnim, transform: [{ scale: logoScale }] },
							]}
						>
							<View style={[styles.logoRing, { borderColor: logoRing }]}>
								<View style={[styles.logoBox, { backgroundColor: logoBg }]}>
									<Ionicons name="car-sport" size={36} color={colors.primary} />
								</View>
							</View>
							<Text style={[styles.appName, { color: colors.text }]}>RoadLift</Text>
							<View style={[styles.taglineChip, { backgroundColor: taglineBg }]}>
								<View style={[styles.taglineDot, { backgroundColor: colors.primary }]} />
								<Text style={[styles.tagline, { color: colors.primary }]}>
									On-demand roadside assistance
								</Text>
							</View>
						</Animated.View>

						{/* ── Form card ── */}
						<Animated.View
							style={[
								styles.card,
								{
									backgroundColor: cardBg,
									borderColor: cardBorder,
									opacity: fadeAnim,
									transform: [{ translateY: slideAnim }],
									shadowColor: isDarkMode ? "#000" : "#5C4A3A",
									shadowOpacity: isDarkMode ? 0.3 : 0.1,
								},
							]}
						>
							<Text style={[styles.cardTitle, { color: colors.text }]}>Welcome back</Text>
							<Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
								Sign in to your account
							</Text>

							<View style={[styles.divider, { backgroundColor: dividerColor }]} />

							{/* Phone */}
							<View style={styles.fieldGroup}>
								<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
									PHONE NUMBER
								</Text>
								<View
									style={[
										styles.inputWrapper,
										{
											backgroundColor: inputBg,
											borderColor: phoneFocused ? colors.primary : inputBorder,
											shadowColor: colors.primary,
											shadowOpacity: phoneFocused ? 0.15 : 0,
										},
									]}
								>
									<Ionicons
										name="call-outline"
										size={18}
										color={phoneFocused ? colors.primary : colors.textMuted}
										style={styles.inputIcon}
									/>
									<TextInput
										style={[styles.input, { color: colors.text }]}
										value={phoneNumber}
										onChangeText={setPhoneNumber}
										keyboardType="phone-pad"
										autoCapitalize="none"
										placeholder="Enter your phone number"
										placeholderTextColor={colors.textMuted}
										onFocus={() => setPhoneFocused(true)}
										onBlur={() => setPhoneFocused(false)}
										returnKeyType="next"
									/>
								</View>
							</View>

							{/* Password */}
							<View style={styles.fieldGroup}>
								<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
									PASSWORD
								</Text>
								<View
									style={[
										styles.inputWrapper,
										{
											backgroundColor: inputBg,
											borderColor: passFocused ? colors.primary : inputBorder,
											shadowColor: colors.primary,
											shadowOpacity: passFocused ? 0.15 : 0,
										},
									]}
								>
									<Ionicons
										name="lock-closed-outline"
										size={18}
										color={passFocused ? colors.primary : colors.textMuted}
										style={styles.inputIcon}
									/>
									<TextInput
										style={[styles.input, { color: colors.text }]}
										value={password}
										onChangeText={setPassword}
										secureTextEntry={!showPassword}
										placeholder="Enter your password"
										placeholderTextColor={colors.textMuted}
										onFocus={() => setPassFocused(true)}
										onBlur={() => setPassFocused(false)}
										returnKeyType="done"
										onSubmitEditing={handleLogin}
									/>
									<TouchableOpacity
										onPress={() => setShowPassword(v => !v)}
										hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
									>
										<Ionicons
											name={showPassword ? "eye-off-outline" : "eye-outline"}
											size={18}
											color={colors.textMuted}
										/>
									</TouchableOpacity>
								</View>
							</View>

							{/* Remember me */}
							<TouchableOpacity
								style={styles.rememberRow}
								onPress={() => setRememberEmail(v => !v)}
								activeOpacity={0.7}
							>
								<View
									style={[
										styles.checkbox,
										{
											borderColor: rememberEmail ? colors.primary : inputBorder,
											backgroundColor: rememberEmail ? colors.primary : "transparent",
										},
									]}
								>
									{rememberEmail && <Ionicons name="checkmark" size={12} color="#fff" />}
								</View>
								<Text style={[styles.rememberLabel, { color: colors.textMuted }]}>
									Remember phone number
								</Text>
							</TouchableOpacity>

							{/* Error */}
							{!!error && (
								<View
									style={[
										styles.errorBox,
										{
											backgroundColor: colors.dangerBg,
											borderColor: colors.dangerBorder,
										},
									]}
								>
									<Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
									<Text style={[styles.errorText, { color: colors.danger }]}>
										{error}
									</Text>
								</View>
							)}

							<PrimaryButton
								title="Sign In"
								onPress={handleLogin}
								isLoading={isSubmitting}
								disabled={isSubmitting}
								style={styles.signInBtn}
							/>
						</Animated.View>

						{/* ── Register link ── */}
						<Animated.View style={{ opacity: fadeAnim }}>
							<View
								style={[
									styles.registerCard,
									{
										backgroundColor: isDarkMode
											? "rgba(255,255,255,0.04)"
											: "rgba(27,25,22,0.04)",
										borderColor: cardBorder,
									},
								]}
							>
								<Text style={[styles.registerHint, { color: colors.textMuted }]}>
									Don't have an account?
								</Text>
								<TouchableOpacity
									onPress={() => navigation.navigate("Register")}
									disabled={isSubmitting}
									activeOpacity={0.7}
								>
									<Text style={[styles.registerLink, { color: colors.primary }]}>
										Create Account →
									</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</View>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1 },
	safeArea: { flex: 1 },
	kav: { flex: 1 },

	// ScrollView fills the KAV; content centres itself via flexGrow + justifyContent.
	// When keyboard appears the scroll view shrinks but content stays scrollable,
	// so inputs never lose focus or get pushed off-screen.
	scroll: { flex: 1 },
	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		paddingHorizontal: 20,
		paddingVertical: 32,
	},

	// Decorative bg blob
	bgShape: {
		position: "absolute",
		top: -120,
		right: -80,
		width: 320,
		height: 320,
		borderRadius: 160,
	},

	// Logo
	logoSection: { alignItems: "center", marginBottom: 28 },
	logoRing: {
		padding: 4,
		borderRadius: 28,
		borderWidth: 1.5,
		marginBottom: 14,
	},
	logoBox: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	appName: {
		fontSize: 32,
		fontWeight: "800",
		letterSpacing: -0.8,
		marginBottom: 10,
	},
	taglineChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 20,
	},
	taglineDot: { width: 5, height: 5, borderRadius: 3 },
	tagline: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },

	// Card
	card: {
		borderRadius: 24,
		borderWidth: 1,
		padding: 24,
		marginBottom: 16,
		shadowOffset: { width: 0, height: 6 },
		shadowRadius: 16,
		elevation: 6,
	},
	cardTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginBottom: 4 },
	cardSubtitle: { fontSize: 14, marginBottom: 20 },
	divider: { height: 1, marginBottom: 20 },

	// Fields
	fieldGroup: { marginBottom: 16 },
	fieldLabel: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 8,
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
		shadowOffset: { width: 0, height: 0 },
		shadowRadius: 8,
		elevation: 0,
	},
	inputIcon: { marginRight: 10 },
	input: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 0,
		includeFontPadding: false, // Android: removes extra internal padding
	},

	// Remember me
	rememberRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 20,
		marginTop: 4,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 6,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	rememberLabel: { fontSize: 13, fontWeight: "500" },

	// Error
	errorBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 8,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
	},
	errorText: { flex: 1, fontSize: 13, lineHeight: 18 },

	signInBtn: { marginTop: 4 },

	// Register footer card
	forgotLink: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
	forgotText: { fontSize: 13, fontWeight: "600" },
	registerCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		borderWidth: 1,
		borderRadius: 16,
		paddingVertical: 14,
		paddingHorizontal: 20,
	},
	registerHint: { fontSize: 14 },
	registerLink: { fontSize: 14, fontWeight: "700" },
});
