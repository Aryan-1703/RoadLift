import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { SERVICES } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { PaymentMethod } from "../types";

const BRAND_COLORS: Record<string, string> = {
	visa:       "#1A1F71",
	mastercard: "#EB001B",
	amex:       "#2E77BC",
	discover:   "#FF6600",
};

const BRAND_LABELS: Record<string, string> = {
	visa:       "VISA",
	mastercard: "MC",
	amex:       "AMEX",
	discover:   "DISC",
};

export const PaymentScreen = () => {
	const { job, setJobStatus } = useJob();
	const { colors } = useTheme();
	const { showToast } = useToast();
	const { initPaymentSheet, presentPaymentSheet } = useStripe();

	const [isProcessing, setIsProcessing] = useState(false);
	const [isLoadingCard, setIsLoadingCard] = useState(true);
	const [defaultCard, setDefaultCard] = useState<PaymentMethod | null>(null);

	const service = SERVICES.find(s => s.id === job.serviceType);
	const subtotal = job.finalPrice ?? job.estimatedPrice ?? 0;
	const tax      = subtotal * 0.13;
	const total    = subtotal + tax;

	// ── Load the user's default saved card ──────────────────────────────────
	useEffect(() => {
		(async () => {
			try {
				const res = await api.get<PaymentMethod[]>("/payments/methods");
				const methods = Array.isArray(res.data) ? res.data : [];
				const def = methods.find(m => m.isDefault) ?? methods[0] ?? null;
				setDefaultCard(def);
			} catch (err) {
				console.warn("[PaymentScreen] Failed to load payment methods:", err);
			} finally {
				setIsLoadingCard(false);
			}
		})();
	}, []);

	// ── Initialise Stripe Payment Sheet then present it ─────────────────────
	const handlePayment = async () => {
		if (!defaultCard) {
			showToast("No payment method on file. Please add a card first.", "error");
			return;
		}

		setIsProcessing(true);
		try {
			// 1. Ask the backend to create a PaymentIntent for this job
			const intentRes = await api.post<{
				paymentIntentClientSecret: string;
				ephemeralKey: string;
				customer: string;
			}>("/payments/create-payment-intent", {
				jobId:  job.id,
				amount: Math.round(total * 100), // Stripe expects cents
			});

			const { paymentIntentClientSecret, ephemeralKey, customer } = intentRes.data;

			// 2. Initialise Stripe Payment Sheet
			const { error: initError } = await initPaymentSheet({
				merchantDisplayName:      "RoadLift",
				customerId:               customer,
				customerEphemeralKeySecret: ephemeralKey,
				paymentIntentClientSecret,
				defaultBillingDetails: {
					// Pre-fill so the user doesn't have to re-enter details
				},
				allowsDelayedPaymentMethods: false,
				returnURL: "roadlift://payment-return",
			});

			if (initError) {
				showToast(initError.message || "Failed to prepare payment", "error");
				return;
			}

			// 3. Present the Payment Sheet
			const { error: presentError } = await presentPaymentSheet();

			if (presentError) {
				if (presentError.code !== "Canceled") {
					showToast(presentError.message || "Payment failed", "error");
				}
				return;
			}

			// 4. Payment succeeded — move to rating
			showToast("Payment successful! 🎉", "success");
			setJobStatus("rating");
		} catch (err: any) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				"Payment failed. Please try again.";
			showToast(msg, "error");
		} finally {
			setIsProcessing(false);
		}
	};

	// ── Card display helper ──────────────────────────────────────────────────
	const renderCard = () => {
		if (isLoadingCard) {
			return (
				<Card style={styles.paymentCard}>
					<ActivityIndicator size="small" color={colors.primary} />
					<Text style={[styles.ccDesc, { color: colors.textMuted, marginLeft: 12 }]}>
						Loading payment method…
					</Text>
				</Card>
			);
		}

		if (!defaultCard) {
			return (
				<Card style={[styles.paymentCard, { borderColor: colors.danger }]}>
					<Ionicons name="card-outline" size={24} color={colors.danger} />
					<View style={styles.ccInfo}>
						<Text style={[styles.ccNumber, { color: colors.danger }]}>
							No payment method on file
						</Text>
						<Text style={[styles.ccDesc, { color: colors.textMuted }]}>
							Please add a card in Payment Methods
						</Text>
					</View>
				</Card>
			);
		}

		const brand      = defaultCard.brand?.toLowerCase() ?? "card";
		const brandColor = BRAND_COLORS[brand] ?? "#555";
		const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase();

		return (
			<Card style={styles.paymentCard}>
				<View style={[styles.ccIcon, { backgroundColor: brandColor }]}>
					<Text style={styles.ccText}>{brandLabel}</Text>
				</View>
				<View style={styles.ccInfo}>
					<Text style={[styles.ccNumber, { color: colors.text }]}>
						•••• •••• •••• {defaultCard.last4}
					</Text>
					<Text style={[styles.ccDesc, { color: colors.textMuted }]}>
						Expires {defaultCard.expMonth}/{String(defaultCard.expYear).slice(-2)} · Default card
					</Text>
				</View>
				<View style={[styles.defaultBadge, { backgroundColor: colors.greenBg }]}>
					<Ionicons name="checkmark-circle" size={16} color={colors.green} />
				</View>
			</Card>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.content}>
				{/* Header */}
				<View style={styles.header}>
					<View style={[styles.iconBox, { backgroundColor: "#D1FAE5" }]}>
						<Ionicons name="checkmark-circle" size={48} color="#059669" />
					</View>
					<Text style={[styles.title, { color: colors.text }]}>Job Completed</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Your provider has finished the service.
					</Text>
				</View>

				{/* Receipt */}
				<Card style={styles.card}>
					<Text
						style={[
							styles.sectionTitle,
							{ color: colors.textMuted, borderBottomColor: colors.border },
						]}
					>
						RECEIPT SUMMARY
					</Text>

					<View style={styles.row}>
						<Text style={[styles.rowText, { color: colors.text }]}>
							{service?.title ?? "Service"} (Base)
						</Text>
						<Text style={[styles.rowText, { color: colors.text }]}>
							${subtotal.toFixed(2)}
						</Text>
					</View>

					{job.finalPrice && job.finalPrice > (job.estimatedPrice ?? 0) && (
						<View style={styles.row}>
							<Text style={[styles.rowText, { color: colors.text }]}>
								Additional Labor/Parts
							</Text>
							<Text style={[styles.rowText, { color: colors.text }]}>
								${(job.finalPrice - (job.estimatedPrice ?? 0)).toFixed(2)}
							</Text>
						</View>
					)}

					<View style={styles.row}>
						<Text style={[styles.rowText, { color: colors.text }]}>
							Taxes & Fees (13%)
						</Text>
						<Text style={[styles.rowText, { color: colors.text }]}>
							${tax.toFixed(2)}
						</Text>
					</View>

					<View style={[styles.totalRow, { borderTopColor: colors.border }]}>
						<Text style={[styles.totalLabel, { color: colors.text }]}>Total Due</Text>
						<Text style={[styles.totalValue, { color: colors.primary }]}>
							${total.toFixed(2)}
						</Text>
					</View>
				</Card>

				{/* Payment method */}
				{renderCard()}
			</ScrollView>

			{/* CTA */}
			<View style={[styles.footer, { backgroundColor: colors.background }]}>
				<PrimaryButton
					title={isProcessing ? "Processing…" : `Pay $${total.toFixed(2)}`}
					onPress={handlePayment}
					isLoading={isProcessing}
					disabled={isLoadingCard || isProcessing || !defaultCard}
				/>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container:    { flex: 1 },
	content:      { padding: 16, paddingBottom: 40 },
	header:       { alignItems: "center", marginBottom: 28, marginTop: 16 },
	iconBox: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	title:      { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
	subtitle:   { fontSize: 15, textAlign: "center" },
	card:       { padding: 20, marginBottom: 16 },
	sectionTitle: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
	},
	row:        { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
	rowText:    { fontSize: 14 },
	totalRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		paddingTop: 16,
		borderTopWidth: 1,
	},
	totalLabel: { fontSize: 16, fontWeight: "bold" },
	totalValue: { fontSize: 26, fontWeight: "900" },
	paymentCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		marginBottom: 16,
	},
	ccIcon: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		marginRight: 14,
	},
	ccText:  { color: "#FFF", fontSize: 10, fontWeight: "bold", fontStyle: "italic" },
	ccInfo:  { flex: 1 },
	ccNumber: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
	ccDesc:  { fontSize: 12 },
	defaultBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	footer: { padding: 16, paddingBottom: 32 },
});
