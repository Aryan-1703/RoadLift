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
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { PaymentMethod } from "../types";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

// Card brand icon map
const BRAND_ICONS: Record<string, string> = {
	visa: "VISA",
	mastercard: "MC",
	amex: "AMEX",
	discover: "DISC",
};

const BRAND_COLORS: Record<string, string> = {
	visa: "#1A1F71",
	mastercard: "#EB001B",
	amex: "#2E77BC",
	discover: "#FF6600",
};

export const PaymentMethodsScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { showToast } = useToast();
	const [payments, setPayments] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

	useEffect(() => {
		loadPayments();
	}, []);

	const loadPayments = async () => {
		try {
			// FIX: was calling /users/payments — correct endpoint is /payments/methods
			const res = await api.get<PaymentMethod[]>("/payments/methods");
			setPayments(Array.isArray(res.data) ? res.data : []);
		} catch (e: any) {
			console.warn("Failed to load payment methods:", e?.message);
			// Graceful degradation — don't show error for empty state
			setPayments([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSetDefault = async (id: string) => {
		setSettingDefaultId(id);
		try {
			await api.put("/payments/set-default", { paymentMethodId: id });
			setPayments(prev =>
				prev.map(pm => ({ ...pm, isDefault: pm.id === id })),
			);
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

	const handleAddCard = async () => {
		// Initialise the Stripe Payment Sheet
		try {
			const res = await api.post<{
				setupIntent: string;
				ephemeralKey: string;
				customer: string;
			}>("/payments/create-setup-intent");

			// In production you'd call Stripe.initPaymentSheet() + presentPaymentSheet() here.
			// For now, inform the user this requires the native Stripe SDK.
			Alert.alert(
				"Add Payment Method",
				"Stripe Payment Sheet ready. Integrate with @stripe/stripe-react-native to present the UI.",
				[{ text: "OK" }],
			);
			console.log("Setup intent created:", res.data.setupIntent?.slice(0, 20) + "…");
		} catch (e: any) {
			showToast(
				e?.response?.data?.message || "Failed to initialize card setup",
				"error",
			);
		}
	};

	const renderItem = ({ item }: { item: PaymentMethod }) => {
		const brand = (item.brand ?? "").toLowerCase();
		const brandLabel = BRAND_ICONS[brand] ?? item.brand?.toUpperCase() ?? "CARD";
		const brandColor = BRAND_COLORS[brand] ?? "#374151";
		const isProcessing = deletingId === item.id || settingDefaultId === item.id;

		return (
			<Card style={[styles.card, { opacity: isProcessing ? 0.6 : 1 }]}>
				<View style={styles.cardRow}>
					{/* Brand chip */}
					<View style={[styles.brandChip, { backgroundColor: brandColor }]}>
						<Text style={styles.brandText}>{brandLabel}</Text>
					</View>

					{/* Card details */}
					<View style={{ flex: 1 }}>
						<View style={styles.brandRow}>
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								•••• {item.last4}
							</Text>
							{item.isDefault && (
								<View
									style={[
										styles.defaultBadge,
										{ backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
									]}
								>
									<Text style={[styles.defaultBadgeText, { color: colors.green }]}>
										Default
									</Text>
								</View>
							)}
						</View>
						<Text style={[styles.cardExp, { color: colors.textMuted }]}>
							Expires {String(item.expMonth).padStart(2, "0")}/{item.expYear}
						</Text>
					</View>

					{/* Actions */}
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
									{ borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
								]}
								onPress={() => handleDelete(item.id)}
								activeOpacity={0.7}
							>
								<Ionicons name="trash-outline" size={16} color={colors.danger} />
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
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<View
								style={[styles.emptyIcon, { backgroundColor: colors.surface }]}
							>
								<Ionicons name="card-outline" size={32} color={colors.textMuted} />
							</View>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								No cards saved
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
								Add a payment method to speed up checkout.
							</Text>
						</View>
					}
				/>
			)}

			<View
				style={[
					styles.footer,
					{ borderTopColor: colors.border, backgroundColor: colors.background },
				]}
			>
				<PrimaryButton title="Add Payment Method" onPress={handleAddCard} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	loader: { marginTop: 60 },
	listContent: { padding: 16, paddingBottom: 110 },

	card: { marginBottom: 10, padding: 14 },
	cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
	brandChip: {
		width: 52,
		height: 34,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	brandText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
	brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
	cardTitle: { fontSize: 16, fontWeight: "700" },
	defaultBadge: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 8,
		borderWidth: 1,
	},
	defaultBadgeText: { fontSize: 10, fontWeight: "700" },
	cardExp: { fontSize: 12 },

	actions: { flexDirection: "row", gap: 8 },
	actionBtn: {
		width: 34,
		height: 34,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
		paddingHorizontal: 32,
	},
	emptyIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
	emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

	footer: {
		padding: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
	},
});
