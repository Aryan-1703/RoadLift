import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { Rating } from "../components/Rating";
import { Card } from "../components/Card";
import { SERVICES } from "../constants";

export const JobCompletionScreen = () => {
	const { job, resetJob } = useJob();
	const { colors } = useTheme();
	const service = SERVICES.find(s => s.id === job.serviceType);

	const [rating, setRating] = useState(5);
	const [review, setReview] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			if (job.id) {
				await api.post(`/jobs/${job.id}/review`, { rating, comment: review });
			}
			resetJob();
		} catch (e) {
			resetJob();
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboard}
			>
				<ScrollView contentContainerStyle={styles.content}>
					<View style={styles.header}>
						<View style={[styles.emojiBox, { backgroundColor: colors.amberBg }]}>
							<Text style={styles.emoji}>🎉</Text>
						</View>
						<Text style={[styles.title, { color: colors.text }]}>
							Payment Successful!
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Thank you for using RoadLift. How was your experience with{" "}
							{job.provider?.name}?
						</Text>
					</View>

					{/* Job summary */}
					<Card style={styles.summaryCard}>
						<View style={styles.summaryRow}>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Service</Text>
							<Text style={[styles.summaryValue, { color: colors.text }]}>
								{service?.title ?? job.serviceType ?? "Service"}
							</Text>
						</View>
						{job.provider?.name && (
							<View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
								<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Provider</Text>
								<Text style={[styles.summaryValue, { color: colors.text }]}>{job.provider.name}</Text>
							</View>
						)}
						<View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Amount Paid</Text>
							<Text style={[styles.summaryTotal, { color: colors.primary }]}>
								${((job.finalPrice ?? job.estimatedPrice ?? 0) * 1.13).toFixed(2)}
							</Text>
						</View>
					</Card>

					<Card style={styles.card}>
						<Rating value={rating} onChange={setRating} />
						<TextInput
							style={[
								styles.input,
								{
									borderColor: colors.border,
									backgroundColor: colors.background,
									color: colors.text,
								},
							]}
							multiline
							numberOfLines={4}
							placeholder="Leave a comment (optional)..."
							placeholderTextColor={colors.textMuted}
							value={review}
							onChangeText={setReview}
						/>
					</Card>

					<View style={styles.actions}>
						<PrimaryButton
							title="Submit & Return Home"
							onPress={handleSubmit}
							isLoading={isSubmitting}
						/>
						<PrimaryButton
							title="Skip"
							variant="secondary"
							onPress={resetJob}
							style={styles.skipBtn}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	keyboard: { flex: 1 },
	content: { padding: 24, flexGrow: 1, justifyContent: "center" },
	header: { alignItems: "center", marginBottom: 32 },
	emojiBox: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	emoji: { fontSize: 40 },
	title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 12 },
	subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
	summaryCard: { padding: 0, marginBottom: 20, overflow: "hidden" },
	summaryRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	summaryLabel: { fontSize: 13 },
	summaryValue: { fontSize: 14, fontWeight: "600" },
	summaryTotal: { fontSize: 16, fontWeight: "800" },
	card: { padding: 32, alignItems: "center", marginBottom: 32 },
	input: {
		width: "100%",
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginTop: 32,
		fontSize: 16,
		minHeight: 100,
		textAlignVertical: "top",
	},
	actions: { marginTop: "auto" },
	skipBtn: { marginTop: 16, backgroundColor: "transparent", elevation: 0 },
});
