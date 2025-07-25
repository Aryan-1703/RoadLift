import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	Alert,
	TouchableOpacity,
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
	// --- HOOKS & CONTEXTS ---
	const { initPaymentSheet, presentPaymentSheet } = useStripe();
	const { token } = useAuth(); // We need the auth token for the API call
	const router = useRouter();
	const { theme } = useTheme();
	const colors = Colors[theme];

	// --- MAIN HANDLER ---
	const handleAddCard = async () => {
		try {
			// 1. Fetch the SetupIntent client secret from your backend
			console.log("Fetching SetupIntent from server...");
			const response = await axios.post(
				`${API_URL}/payments/create-setup-intent`,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			const { clientSecret } = response.data;
			if (!clientSecret) {
				throw new Error("Missing clientSecret from server response.");
			}
			console.log("Received clientSecret.");

			// 2. Initialize the Payment Sheet
			const { error: initError } = await initPaymentSheet({
				merchantDisplayName: "TowLink, Inc.",
				// customerId: ..., (optional but good)
				// customerEphemeralKeySecret: ..., (optional, for advanced usage)
				setupIntentClientSecret: clientSecret,
				allowsDelayedPaymentMethods: false,
			});

			if (initError) {
				console.error("Error initializing PaymentSheet:", initError);
				Alert.alert("Error", `Could not initialize payment sheet: ${initError.message}`);
				return;
			}
			console.log("PaymentSheet initialized.");

			// 3. Present the Payment Sheet to the user
			const { error: presentError } = await presentPaymentSheet();

			if (presentError) {
				if (presentError.code === "Canceled") {
					console.log("User canceled the payment sheet.");
				} else {
					console.error("Error presenting PaymentSheet:", presentError);
					Alert.alert("Error", `Payment failed: ${presentError.message}`);
				}
			} else {
				// If there's no error, the card was saved successfully
				console.log("Payment method saved successfully!");
				Alert.alert("Success", "Your payment method has been saved.");
				router.back(); // Go back to the previous screen (e.g., Settings)
			}
		} catch (apiError) {
			console.error("API Error:", apiError.response?.data || apiError.message);
			Alert.alert("Error", "Could not set up payment. Please try again later.");
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ModalHeader title="Add Payment Method" />
			<View style={styles.content}>
				<FontAwesome5 name="credit-card" size={80} color={colors.tint} />
				<Text style={[styles.title, { color: colors.text }]}>Securely Add Your Card</Text>
				<Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
					Your payment details are sent directly to Stripe and never touch our servers.
					Add a card now for faster service requests.
				</Text>
				<TouchableOpacity
					style={[styles.button, { backgroundColor: colors.tint }]}
					onPress={handleAddCard}
				>
					<Text style={styles.buttonText}>Add a Card or Use Apple/Google Pay</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	title: { fontSize: 22, fontWeight: "bold", marginTop: 30, marginBottom: 10 },
	subtitle: { fontSize: 16, textAlign: "center", marginBottom: 40 },
	button: { width: "100%", padding: 15, borderRadius: 10, alignItems: "center" },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default AddPaymentScreen;
