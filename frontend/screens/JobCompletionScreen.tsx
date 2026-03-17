import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	TouchableOpacity,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { SERVICES } from "../constants";
import { Ionicons } from "@expo/vector-icons";

export const JobCompletionScreen = () => {
	const { job, resetJob } = useJob();
	const { colors, isDarkMode } = useTheme();
	const service = SERVICES.find(s => s.id === job.serviceType);

	const [rating, setRating] = useState(5);
	const [review, setReview] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [reviewFocused, setReviewFocused] = useState(false);

	// Entrance animations
	const heroScale    = useRef(new Animated.Value(0.6)).current;
	const heroOpacity  = useRef(new Animated.Value(0)).current;
	const ringOpacity  = useRef(new Animated.Value(0)).current;
	const contentAnim  = useRef(new Animated.Value(0)).current;
	const contentSlide = useRef(new Animated.Value(28)).current;

	useEffect(() => {
		Animated.sequence([
			Animated.parallel([
				Animated.spring(heroScale,   { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
				Animated.timing(heroOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
			]),
			Animated.timing(ringOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
			Animated.parallel([
				Animated.timing(contentAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
				Animated.spring(contentSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
			]),
		]).start();
	}, []);

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			if (job.id) await api.post(`/jobs/${job.id}/review`, { rating, comment: review });
			resetJob();
		} catch {
			resetJob();
		}
	};

	const totalAmount = ((job.finalPrice ?? job.estimatedPrice ?? 0) * 1.13).toFixed(2);
	const cardBg      = isDarkMode ? "#0d1424" : "#FFFFFF";
	const cardBorder  = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";
	const inputBg     = isDarkMode ? "#0a1020" : "#F7F4EF";
	const inputBorder = isDarkMode ? "rgba(255,255,255,0.10)" : "#D4CFC8";
	const dashColor   = isDarkMode ? "rgba(255,255,255,0.12)" : "#D4CFC8";

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.kav}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* ── Success hero ── */}
					<Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
						<Animated.View style={[styles.outerRing, { borderColor: colors.green + "28", opacity: ringOpacity }]} />
						<View style={[styles.innerRing, { borderColor: colors.green + "55" }]}>
							<View style={[styles.iconCircle, { backgroundColor: colors.greenBg }]}>
								<Ionicons name="checkmark" size={40} color={colors.green} />
							</View>
						</View>
					</Animated.View>

					{/* ── Content slides in after hero ── */}
					<Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentSlide }] }}>
						<Text style={[styles.successTitle, { color: colors.text }]}>Payment Successful!</Text>
						<Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
							Your service has been completed.
							{job.provider?.name ? `\nThank you, ${job.provider.name}!` : ""}
						</Text>

						{/* ── Receipt card ── */}
						<View style={[styles.receiptCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
							<View style={styles.receiptHeader}>
								<View style={[styles.receiptIconWrap, { backgroundColor: colors.accentBg }]}>
									<Ionicons name="receipt-outline" size={17} color={colors.primary} />
								</View>
								<Text style={[styles.receiptTitle, { color: colors.text }]}>Receipt</Text>
							</View>

							<View style={[styles.receiptDivider, { backgroundColor: cardBorder }]} />

							<View style={styles.receiptRow}>
								<Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Service</Text>
								<Text style={[styles.receiptValue, { color: colors.text }]}>
									{service?.title ?? job.serviceType ?? "Service"}
								</Text>
							</View>

							{job.provider?.name && (
								<View style={styles.receiptRow}>
									<Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Provider</Text>
									<Text style={[styles.receiptValue, { color: colors.text }]}>{job.provider.name}</Text>
								</View>
							)}

							{/* Dashed separator before total */}
							<View style={styles.dashedRow}>
								{Array.from({ length: 22 }).map((_, i) => (
									<View key={i} style={[styles.dash, { backgroundColor: dashColor }]} />
								))}
							</View>

							<View style={[styles.receiptRow, { marginBottom: 0 }]}>
								<Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
								<Text style={[styles.totalValue, { color: colors.green }]}>${totalAmount}</Text>
							</View>
						</View>

						{/* ── Rate section ── */}
						<View style={[styles.rateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
							<Text style={[styles.rateTitle, { color: colors.text }]}>
								How was your experience?
							</Text>
							<Text style={[styles.rateSubtitle, { color: colors.textMuted }]}>
								Tap a star to rate {job.provider?.name ?? "your driver"}
							</Text>

							<View style={styles.starsRow}>
								{[1, 2, 3, 4, 5].map(star => (
									<TouchableOpacity
										key={star}
										onPress={() => setRating(star)}
										activeOpacity={0.7}
										style={styles.starBtn}
									>
										<Ionicons
											name={star <= rating ? "star" : "star-outline"}
											size={36}
											color={
												star <= rating
													? "#FBBF24"
													: isDarkMode ? "rgba(255,255,255,0.18)" : "#D4CFC8"
											}
										/>
									</TouchableOpacity>
								))}
							</View>

							{/* Rating label */}
							<Text style={[styles.ratingLabel, { color: colors.primary }]}>
								{["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
							</Text>

							{/* Comment input */}
							<View
								style={[
									styles.reviewInputWrap,
									{
										backgroundColor: inputBg,
										borderColor: reviewFocused ? colors.primary : inputBorder,
										shadowColor: colors.primary,
										shadowOpacity: reviewFocused ? 0.12 : 0,
									},
								]}
							>
								<TextInput
									style={[styles.reviewInput, { color: colors.text }]}
									multiline
									numberOfLines={3}
									placeholder="Leave a comment (optional)..."
									placeholderTextColor={colors.textMuted}
									value={review}
									onChangeText={setReview}
									onFocus={() => setReviewFocused(true)}
									onBlur={() => setReviewFocused(false)}
								/>
							</View>
						</View>

						{/* ── Actions ── */}
						<PrimaryButton
							title="Submit & Go Home"
							onPress={handleSubmit}
							isLoading={isSubmitting}
						/>
						<TouchableOpacity style={styles.skipBtn} onPress={resetJob} activeOpacity={0.7}>
							<Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
						</TouchableOpacity>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	kav:       { flex: 1 },
	content:   { padding: 24, paddingTop: 44 },

	// Success hero
	hero: { alignItems: "center", marginBottom: 28 },
	outerRing: {
		position: "absolute",
		width: 124, height: 124, borderRadius: 62,
		borderWidth: 1.5,
	},
	innerRing: {
		padding: 6,
		borderRadius: 52,
		borderWidth: 1.5,
	},
	iconCircle: {
		width: 82, height: 82, borderRadius: 41,
		alignItems: "center", justifyContent: "center",
	},

	successTitle: {
		fontSize: 28, fontWeight: "800", letterSpacing: -0.6,
		textAlign: "center", marginBottom: 8,
	},
	successSubtitle: {
		fontSize: 15, textAlign: "center", lineHeight: 22,
		marginBottom: 28,
	},

	// Receipt card
	receiptCard: {
		borderRadius: 24, borderWidth: 1,
		padding: 20, marginBottom: 16,
	},
	receiptHeader: {
		flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
	},
	receiptIconWrap: {
		width: 34, height: 34, borderRadius: 10,
		alignItems: "center", justifyContent: "center",
	},
	receiptTitle: { fontSize: 16, fontWeight: "700" },
	receiptDivider: { height: 1, marginBottom: 16 },
	receiptRow: {
		flexDirection: "row", justifyContent: "space-between",
		alignItems: "center", marginBottom: 10,
	},
	receiptLabel: { fontSize: 13 },
	receiptValue: { fontSize: 14, fontWeight: "600" },

	// Dashed line
	dashedRow: {
		flexDirection: "row", justifyContent: "space-between",
		marginVertical: 14,
	},
	dash: { width: 6, height: 2, borderRadius: 1 },

	totalLabel: { fontSize: 15, fontWeight: "700" },
	totalValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },

	// Rate card
	rateCard: {
		borderRadius: 24, borderWidth: 1,
		padding: 20, marginBottom: 24,
		alignItems: "center",
	},
	rateTitle:    { fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" },
	rateSubtitle: { fontSize: 13, marginBottom: 20, textAlign: "center" },
	starsRow:     { flexDirection: "row", gap: 4, marginBottom: 10 },
	starBtn:      { padding: 5 },
	ratingLabel:  { fontSize: 13, fontWeight: "700", letterSpacing: 0.2, marginBottom: 20 },

	// Review input
	reviewInputWrap: {
		width: "100%",
		borderWidth: 1.5, borderRadius: 14,
		paddingHorizontal: 14, paddingVertical: 12,
		shadowOffset: { width: 0, height: 0 }, shadowRadius: 8,
	},
	reviewInput: {
		fontSize: 14, minHeight: 68, textAlignVertical: "top",
	},

	// CTA
	skipBtn: { alignItems: "center", marginTop: 16, paddingVertical: 12 },
	skipText: { fontSize: 14, fontWeight: "600" },
});
