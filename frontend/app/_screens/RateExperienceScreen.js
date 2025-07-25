import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TextInput,
	Alert,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../_context/AuthContext";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import { API_URL } from "../config/constants";
import StarRating from "../_components/StarRating";
import ModalHeader from "../_components/ModalHeader";

const RateExperienceScreen = () => {
	// --- HOOKS & STATE ---
	const { jobId } = useLocalSearchParams();
	const router = useRouter();
	const { token } = useAuth();
	const { theme } = useTheme();

	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// --- THEME ---
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	// --- HANDLER ---
	const handleSubmitReview = async () => {
		if (rating === 0) {
			Alert.alert("Rating Required", "Please select at least one star.");
			return;
		}
		setIsLoading(true);
		try {
			const reviewData = {
				rating: rating,
				comment: comment,
			};

			await axios.post(`${API_URL}/jobs/${jobId}/review`, reviewData, {
				headers: { Authorization: `Bearer ${token}` },
			});

			Alert.alert("Thank You!", "Your feedback has been submitted.");
			// After submitting, navigate back to the main dashboard
			router.replace("/tabs");
		} catch (error) {
			console.error("Failed to submit review:", error.response?.data);
			Alert.alert("Error", "Could not submit your review. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Rate Your Experience" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.container} // Use flex: 1 for KeyboardAvoidingView
			>
				{/* 2. Wrap the form content in a ScrollView */}
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled" // Allows tapping the button while keyboard is open
				>
					<Text style={[styles.title, { color: colors.text }]}>
						How was your service?
					</Text>
					<Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
						Your feedback helps us improve our platform for everyone.
					</Text>

					<View style={styles.ratingContainer}>
						<StarRating rating={rating} onRatingChange={setRating} />
					</View>

					<TextInput
						style={[
							styles.commentInput,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Add a comment (optional)..."
						placeholderTextColor={colors.tabIconDefault}
						value={comment}
						onChangeText={setComment}
						multiline
					/>

					<TouchableOpacity
						style={[
							styles.button,
							{ backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 },
						]}
						onPress={handleSubmitReview}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.buttonText}>Submit Feedback</Text>
						)}
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

// --- STYLESHEET (with updates) ---
const styles = StyleSheet.create({
	container: { flex: 1 },
	// 3. Update the content style to grow and allow scrolling
	content: {
		flexGrow: 1, // Allows the content to grow and fill space
		padding: 20,
		alignItems: "center",
		justifyContent: "center", // Center content vertically
	},
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
	subtitle: { fontSize: 16, textAlign: "center", marginBottom: 40 },
	ratingContainer: { marginBottom: 30 },
	commentInput: {
		width: "100%",
		height: 120,
		borderWidth: 1,
		borderRadius: 12,
		padding: 15,
		textAlignVertical: "top",
		fontSize: 16,
		marginBottom: 20, // 4. Remove 'marginBottom: auto'
	},
	button: {
		width: "100%",
		padding: 15,
		borderRadius: 12,
		alignItems: "center",
		marginTop: "auto", // 5. Use 'marginTop: auto' to push the button to the bottom
	},
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default RateExperienceScreen;
