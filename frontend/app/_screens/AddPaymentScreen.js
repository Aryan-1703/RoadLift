import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	Alert,
	TouchableOpacity,
	ActivityIndicator,
	StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import axios from "axios";
import { API_URL } from "../config/constants";
import { useAuth } from "../_context/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";

const AddPaymentScreen = () => {
	const { initPaymentSheet, presentPaymentSheet } = useStripe();
	const { token } = useAuth();
	const router = useRouter();
	const { theme } = useTheme();
	const colors = Colors[theme];
	const isDarkMode = theme === "dark";
	const [isLoading, setIsLoading] = useState(false);

	const handleAddCard = async () => {
		setIsLoading(true);
		try {
			// 1. Fetch secrets from backend
			const response = await axios.post(
				`${API_URL}/payments/create-setup-intent`,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			const { setupIntent, ephemeralKey, customer } = response.data;

			// 2. Initialize Payment Sheet
			const { error: initError } = await initPaymentSheet({
				merchantDisplayName: "TowLink, Inc.",
				customerId: customer,
				customerEphemeralKeySecret: ephemeralKey,
				setupIntentClientSecret: setupIntent,
				allowsDelayedPaymentMethods: false,
			});

			if (initError) {
				throw new Error(`Could not initialize payment sheet: ${initError.message}`);
			}

			// 3. Present Payment Sheet
			const { error: presentError } = await presentPaymentSheet();

			if (presentError) {
				if (presentError.code !== "Canceled") {
					throw new Error(`Payment failed: ${presentError.message}`);
				}
			} else {
				Alert.alert("Success", "Your payment method has been saved.");
				router.back();
			}
		} catch (error) {
			Alert.alert(
				"Error",
				error.message || "Could not set up payment. Please try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Add Payment Method" />
			<View style={styles.content}>
				<FontAwesome5 name="credit-card" size={80} color={colors.tint} />
				<Text style={[styles.title, { color: colors.text }]}>Securely Add Your Card</Text>
				<Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
					Your details are handled by Stripe for maximum security. Add a card for faster
					requests.
				</Text>
				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={handleAddCard}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Add Card or Use Wallet</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	title: {
		fontSize: 22,
		fontWeight: "bold",
		marginTop: 30,
		marginBottom: 10,
		textAlign: "center",
	},
	subtitle: { fontSize: 16, textAlign: "center", marginBottom: 40, lineHeight: 24 },
	button: { width: "100%", padding: 15, borderRadius: 10, alignItems: "center" },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default AddPaymentScreen;
