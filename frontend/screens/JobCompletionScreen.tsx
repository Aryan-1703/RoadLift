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

export const JobCompletionScreen = () => {
	const { job, resetJob } = useJob();
	const { colors } = useTheme();

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
						<View style={styles.emojiBox}>
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
		backgroundColor: "#FEF3C7",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	emoji: { fontSize: 40 },
	title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 12 },
	subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
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
