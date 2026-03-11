import React from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { SERVICES } from "../constants";
import { Ionicons } from "@expo/vector-icons";

export const PaymentScreen = () => {
	const { job, setJobStatus } = useJob();
	const { colors } = useTheme();

	const service = SERVICES.find(s => s.id === job.serviceType);

	// capturedTotal = what Stripe actually charged (includes tax), set when capture succeeds
	const capturedTotal = job.capturedTotal ?? null;
	const subtotal      = job.finalPrice ?? job.estimatedPrice ?? 0;
	// Use actual tax from Stripe if available, otherwise estimate at 13%
	const tax           = capturedTotal != null
		? Math.max(0, capturedTotal - subtotal)
		: subtotal * 0.13;
	const total         = capturedTotal ?? (subtotal + tax);

	const paymentSucceeded = capturedTotal != null && capturedTotal > 0;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<View style={[
						styles.iconBox,
						{ backgroundColor: paymentSucceeded ? colors.greenBg : colors.primary + '15' },
					]}>
						<Ionicons
							name={paymentSucceeded ? "checkmark-circle" : "time-outline"}
							size={48}
							color={paymentSucceeded ? colors.green : colors.primary}
						/>
					</View>
					<Text style={[styles.title, { color: colors.text }]}>
						{paymentSucceeded ? "Payment Complete" : "Service Complete"}
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						{paymentSucceeded
							? "Your payment has been processed. Thank you for using RoadLift!"
							: "Your service is complete. Payment is being finalized."}
					</Text>
				</View>

				<Card style={styles.card}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted, borderBottomColor: colors.border }]}>
						RECEIPT SUMMARY
					</Text>
					<View style={styles.row}>
						<Text style={[styles.rowText, { color: colors.text }]}>{service?.title ?? "Service"} (Base)</Text>
						<Text style={[styles.rowText, { color: colors.text }]}>${subtotal.toFixed(2)}</Text>
					</View>
					{job.finalPrice != null && job.estimatedPrice != null && job.finalPrice > job.estimatedPrice && (
						<View style={styles.row}>
							<Text style={[styles.rowText, { color: colors.text }]}>Additional Labor/Parts</Text>
							<Text style={[styles.rowText, { color: colors.text }]}>
								${(job.finalPrice - job.estimatedPrice).toFixed(2)}
							</Text>
						</View>
					)}
					<View style={styles.row}>
						<Text style={[styles.rowText, { color: colors.text }]}>Taxes & Fees (13%)</Text>
						<Text style={[styles.rowText, { color: colors.text }]}>${tax.toFixed(2)}</Text>
					</View>
					<View style={[styles.totalRow, { borderTopColor: colors.border }]}>
						<Text style={[styles.totalLabel, { color: colors.text }]}>
							{paymentSucceeded ? "Total Charged" : "Estimated Total"}
						</Text>
						<Text style={[styles.totalValue, { color: colors.primary }]}>${total.toFixed(2)}</Text>
					</View>
				</Card>

				{paymentSucceeded ? (
					<Card style={[styles.statusCard, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
						<Ionicons name="shield-checkmark" size={20} color={colors.green} />
						<Text style={[styles.statusText, { color: colors.green }]}>
							Payment processed securely via Stripe
						</Text>
					</Card>
				) : (
					<Card style={[styles.statusCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
						<Ionicons name="information-circle-outline" size={20} color={colors.primary} />
						<Text style={[styles.statusText, { color: colors.primary }]}>
							Payment is being finalized. You will not be charged twice.
						</Text>
					</Card>
				)}
			</ScrollView>

			<View style={[styles.footer, { backgroundColor: colors.background }]}>
				<PrimaryButton title="Continue" onPress={() => setJobStatus("rating")} />
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container:  { flex: 1 },
	content:    { padding: 16, paddingBottom: 40 },
	header:     { alignItems: "center", marginBottom: 28, marginTop: 16 },
	iconBox: {
		width: 80, height: 80, borderRadius: 40,
		alignItems: "center", justifyContent: "center", marginBottom: 16,
	},
	title:    { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
	subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
	card:     { padding: 20, marginBottom: 16 },
	sectionTitle: {
		fontSize: 11, fontWeight: "700", letterSpacing: 0.8,
		marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1,
	},
	row:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
	rowText: { fontSize: 14 },
	totalRow: {
		flexDirection: "row", justifyContent: "space-between",
		alignItems: "center", marginTop: 8, paddingTop: 16, borderTopWidth: 1,
	},
	totalLabel: { fontSize: 16, fontWeight: "bold" },
	totalValue: { fontSize: 26, fontWeight: "900" },
	statusCard: {
		flexDirection: "row", alignItems: "center",
		padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 16,
	},
	statusText: { fontSize: 13, fontWeight: "600", flex: 1 },
	footer: { padding: 16, paddingBottom: 32 },
});
