import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { PaymentMethod } from "../types";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

const BRAND_COLORS: Record<string, string> = {
	visa: "#1A1F71",
	mastercard: "#EB001B",
	amex: "#2E77BC",
	discover: "#FF6600",
};
const BRAND_LABELS: Record<string, string> = {
	visa: "VISA",
	mastercard: "MC",
	amex: "AMEX",
	discover: "DISC",
};

export const PaymentMethodsScreen = () => {
	const { colors } = useTheme();
	const { showToast } = useToast();
	const { initPaymentSheet, presentPaymentSheet } = useStripe();

	const [payments, setPayments] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(true);
	const [addingCard, setAddingCard] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

	useEffect(() => {
		loadPayments();
	}, []);

	const loadPayments = async () => {
		setLoading(true);
		try {
			const res = await api.get<PaymentMethod[]>("/payments/methods");
			setPayments(Array.isArray(res.data) ? res.data : []);
		} catch (e: any) {
			console.warn("Failed to load payment methods:", e?.message);
			setPayments([]);
		} finally {
			setLoading(false);
		}
	};

	// ── Add card via Stripe Setup Intent + Payment Sheet ─────────────────────
	const handleAddCard = async () => {
		setAddingCard(true);
		try {
			// 1. Ask backend to create a SetupIntent
			const res = await api.post<{
				setupIntent: string;
				ephemeralKey: string;
				customer: string;
			}>("/payments/create-setup-intent");

			const { setupIntent, ephemeralKey, customer } = res.data;

			// 2. Initialise the Payment Sheet in "setup" mode (saves card, no charge)
			const { error: initError } = await initPaymentSheet({
				merchantDisplayName: "RoadLift",
				customerId: customer,
				customerEphemeralKeySecret: ephemeralKey,
				setupIntentClientSecret: setupIntent,
				allowsDelayedPaymentMethods: false,
				returnURL: "roadlift://payment-return",
			});

			if (initError) {
				showToast(initError.message || "Failed to open card form", "error");
				return;
			}

			// 3. Present the sheet
			const { error: presentError } = await presentPaymentSheet();

			if (presentError) {
				if (presentError.code !== "Canceled") {
					showToast(presentError.message || "Card setup failed", "error");
				}
				return;
			}

			// 4. Card saved — reload the list
			showToast("Card added successfully!", "success");
			await loadPayments();
		} catch (e: any) {
			showToast(e?.response?.data?.message || "Failed to add card", "error");
		} finally {
			setAddingCard(false);
		}
	};

	const handleSetDefault = async (id: string) => {
		setSettingDefaultId(id);
		try {
			await api.put("/payments/set-default", { paymentMethodId: id });
			setPayments(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
			showToast("Default card updated", "success");
		} catch {
			showToast("Failed to update default card", "error");
		} finally {
			setSettingDefaultId(null);
		}
	};

	const handleDelete = (id: string) => {
		Alert.alert("Remove Card", "Are you sure you want to remove this card?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: async () => {
					setDeletingId(id);
					try {
						await api.delete(`/payments/methods/${id}`);
						setPayments(prev => prev.filter(pm => pm.id !== id));
						showToast("Card removed", "success");
					} catch {
						showToast("Failed to remove card", "error");
					} finally {
						setDeletingId(null);
					}
				},
			},
		]);
	};

	const renderItem = ({ item }: { item: PaymentMethod }) => {
		const brand = (item.brand ?? "").toLowerCase();
		const brandLabel = BRAND_LABELS[brand] ?? item.brand?.toUpperCase() ?? "CARD";
		const brandColor = BRAND_COLORS[brand] ?? "#374151";
		const isProcessing = deletingId === item.id || settingDefaultId === item.id;

		return (
			<Card style={[styles.card, { opacity: isProcessing ? 0.6 : 1 }]}>
				<View style={styles.cardRow}>
					<View style={[styles.brandChip, { backgroundColor: brandColor }]}>
						<Text style={styles.brandText}>{brandLabel}</Text>
					</View>
					<View style={{ flex: 1 }}>
						<View style={styles.brandRow}>
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								•••• {item.last4}
							</Text>
							{item.isDefault && (
								<View
									style={[
										styles.defaultBadge,
										{ backgroundColor: colors.primary + "20" },
									]}
								>
									<Text style={[styles.defaultBadgeText, { color: colors.primary }]}>
										Default
									</Text>
								</View>
							)}
						</View>
						<Text style={[styles.cardExp, { color: colors.textMuted }]}>
							Expires {String(item.expMonth).padStart(2, "0")}/{item.expYear}
						</Text>
					</View>
					{isProcessing ? (
						<ActivityIndicator size="small" color={colors.primary} />
					) : (
						<View style={styles.actions}>
							{!item.isDefault && (
								<TouchableOpacity
									style={[styles.actionBtn, { borderColor: colors.border }]}
									onPress={() => handleSetDefault(item.id)}
									activeOpacity={0.7}
								>
									<Ionicons name="star-outline" size={16} color={colors.primary} />
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={[
									styles.actionBtn,
									{ borderColor: "#FCA5A5", backgroundColor: "#FEE2E2" },
								]}
								onPress={() => handleDelete(item.id)}
								activeOpacity={0.7}
							>
								<Ionicons name="trash-outline" size={16} color="#DC2626" />
							</TouchableOpacity>
						</View>
					)}
				</View>
			</Card>
		);
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{loading ? (
				<ActivityIndicator color={colors.primary} style={styles.loader} />
			) : (
				<FlatList
					data={payments}
					keyExtractor={item => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.list}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Ionicons name="card-outline" size={48} color={colors.textMuted} />
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								No cards saved
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
								Add a payment method to pay for services quickly.
							</Text>
						</View>
					}
				/>
			)}
			<View
				style={[
					styles.footer,
					{ backgroundColor: colors.background, borderTopColor: colors.border },
				]}
			>
				<PrimaryButton
					title={addingCard ? "Opening…" : "+ Add Payment Method"}
					onPress={handleAddCard}
					isLoading={addingCard}
					disabled={addingCard}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	loader: { flex: 1, marginTop: 40 },
	list: { padding: 16, paddingBottom: 100 },
	card: { marginBottom: 12, padding: 16 },
	cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	brandChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
	brandText: { color: "#FFF", fontSize: 10, fontWeight: "800", fontStyle: "italic" },
	brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
	cardTitle: { fontSize: 15, fontWeight: "700" },
	cardExp: { fontSize: 12 },
	defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
	defaultBadgeText: { fontSize: 11, fontWeight: "700" },
	actions: { flexDirection: "row", gap: 8 },
	actionBtn: {
		width: 34,
		height: 34,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	empty: { alignItems: "center", paddingTop: 80, gap: 12 },
	emptyTitle: { fontSize: 18, fontWeight: "700" },
	emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
	footer: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
});
