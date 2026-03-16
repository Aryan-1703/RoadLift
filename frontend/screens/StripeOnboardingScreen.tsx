import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Linking,
	ActivityIndicator,
	AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";

type PayoutStatus = "not_connected" | "incomplete" | "pending" | "active";

// ─────────────────────────────────────────────────────────────────────────────
// Feature rows
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
	{
		icon: "flash-outline" as const,
		title: "Instant Payouts",
		body: "Get paid within 1–2 business days after completing a job.",
	},
	{
		icon: "shield-checkmark-outline" as const,
		title: "Secure & Encrypted",
		body: "Your banking details are handled directly by Stripe — never stored by RoadLift.",
	},
	{
		icon: "card-outline" as const,
		title: "Flexible Withdrawals",
		body: "Transfer earnings to any Canadian bank account or debit card.",
	},
	{
		icon: "document-text-outline" as const,
		title: "Tax-Ready Reports",
		body: "Download earnings summaries for T4A filing directly from your Stripe dashboard.",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export const StripeOnboardingScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { showToast } = useToast();
	const [loading, setLoading]           = useState(false);
	const [statusLoading, setStatusLoading] = useState(true);
	const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_connected");
	const [requirementsCount, setRequirementsCount] = useState(0);

	const fetchPayoutStatus = useCallback(async () => {
		try {
			const res = await api.get<{ status: PayoutStatus; requirementsCount: number }>(
				"/driver/payout-status",
			);
			setPayoutStatus(res.data.status);
			setRequirementsCount(res.data.requirementsCount);
		} catch {
			// non-fatal — show default state
		} finally {
			setStatusLoading(false);
		}
	}, []);

	// Load status on mount
	useEffect(() => {
		fetchPayoutStatus();
	}, [fetchPayoutStatus]);

	// Re-check status when driver returns from Stripe in browser
	useEffect(() => {
		const sub = AppState.addEventListener("change", state => {
			if (state === "active") fetchPayoutStatus();
		});
		return () => sub.remove();
	}, [fetchPayoutStatus]);

	const handleStartOnboarding = async () => {
		setLoading(true);
		try {
			const res = await api.post<{ url: string }>("/driver/stripe-onboarding");
			const url = res.data?.url;
			if (!url) throw new Error("No onboarding URL returned from server.");
			await Linking.openURL(url);
		} catch (e: any) {
			const msg =
				e?.response?.data?.message || e?.message || "Failed to start Stripe onboarding.";
			showToast(msg, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleLearnMore = () => {
		Linking.openURL("https://stripe.com/en-ca/connect");
	};

	// ── Status banner config ─────────────────────────────────────────────────
	const statusConfig: Record<PayoutStatus, { icon: string; color: string; bg: string; border: string; label: string; hint: string }> = {
		not_connected: { icon: "alert-circle-outline",    color: colors.textMuted, bg: colors.surface,    border: colors.border,      label: "Not Connected",    hint: "Set up your bank account to receive payouts." },
		incomplete:    { icon: "time-outline",            color: "#F59E0B",        bg: "#FEF3C7",         border: "#FDE68A",           label: "Setup Incomplete", hint: "You have pending requirements. Tap below to finish." },
		pending:       { icon: "hourglass-outline",       color: "#3B82F6",        bg: "#EFF6FF",         border: "#BFDBFE",           label: "Under Review",     hint: "Stripe is reviewing your account. This usually takes 1–2 business days." },
		active:        { icon: "checkmark-circle-outline", color: colors.green,    bg: colors.greenBg,    border: colors.greenBorder,  label: "Payouts Active",   hint: "Your earnings will be transferred automatically after each job." },
	};
	const sc = statusConfig[payoutStatus];

	// ── Derived colors ───────────────────────────────────────────────────────
	const stripePurple = "#635BFF";
	const stripePurpleBg = isDarkMode ? "rgba(99,91,255,0.15)" : "rgba(99,91,255,0.08)";
	const stripePurpleBorder = isDarkMode ? "rgba(99,91,255,0.30)" : "rgba(99,91,255,0.18)";

	return (
		<SafeAreaView
			style={[styles.root, { backgroundColor: colors.background }]}
			edges={["bottom"]}
		>
			<ScrollView
				contentContainerStyle={styles.scroll}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Hero ──────────────────────────────────────────────────── */}
				<View style={styles.hero}>
					<View
						style={[
							styles.heroIcon,
							{ backgroundColor: stripePurpleBg, borderColor: stripePurpleBorder },
						]}
					>
						<Ionicons name="wallet-outline" size={36} color={stripePurple} />
					</View>

					<Text style={[styles.heroTitle, { color: colors.text }]}>Set Up Payouts</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
						Connect your bank account via Stripe to receive payment for completed jobs. It
						only takes a few minutes.
					</Text>
				</View>

				{/* ── Payout status banner ──────────────────────────────────── */}
			{statusLoading ? (
				<ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
			) : (
				<View style={[styles.statusBanner, { backgroundColor: sc.bg, borderColor: sc.border }]}>
					<Ionicons name={sc.icon as any} size={20} color={sc.color} />
					<View style={{ flex: 1 }}>
						<Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
						<Text style={[styles.statusHint, { color: colors.textMuted }]}>{sc.hint}</Text>
					</View>
					{requirementsCount > 0 && (
						<View style={[styles.reqBadge, { backgroundColor: sc.color }]}>
							<Text style={styles.reqBadgeText}>{requirementsCount}</Text>
						</View>
					)}
				</View>
			)}

			{/* ── Stripe badge ──────────────────────────────────────────── */}
				<View
					style={[
						styles.stripeBadge,
						{ backgroundColor: stripePurpleBg, borderColor: stripePurpleBorder },
					]}
				>
					<Ionicons name="lock-closed" size={14} color={stripePurple} />
					<Text style={[styles.stripeBadgeText, { color: stripePurple }]}>
						Powered by Stripe Connect — industry-standard financial infrastructure
					</Text>
				</View>

				{/* ── Feature cards ─────────────────────────────────────────── */}
				<View style={styles.features}>
					{FEATURES.map(f => (
						<Card key={f.title} style={styles.featureCard}>
							<View
								style={[styles.featureIconWrap, { backgroundColor: colors.accentBg }]}
							>
								<Ionicons name={f.icon} size={20} color={colors.primary} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.featureTitle, { color: colors.text }]}>
									{f.title}
								</Text>
								<Text style={[styles.featureBody, { color: colors.textMuted }]}>
									{f.body}
								</Text>
							</View>
						</Card>
					))}
				</View>

				{/* ── What to expect ────────────────────────────────────────── */}
				<View
					style={[
						styles.stepsCard,
						{ backgroundColor: colors.card, borderColor: colors.cardBorder },
					]}
				>
					<Text style={[styles.stepsTitle, { color: colors.text }]}>What to expect</Text>

					{[
						"Tap Connect with Stripe below",
						"Verify your identity with a government-issued ID",
						"Enter your Canadian bank account details",
						"Start accepting jobs — earnings transfer automatically",
					].map((step, i) => (
						<View key={i} style={styles.stepRow}>
							<View style={[styles.stepNum, { backgroundColor: colors.accentBg }]}>
								<Text style={[styles.stepNumText, { color: colors.primary }]}>
									{i + 1}
								</Text>
							</View>
							<Text style={[styles.stepText, { color: colors.textMuted }]}>{step}</Text>
						</View>
					))}
				</View>

				{/* ── Learn more ────────────────────────────────────────────── */}
				<View style={styles.learnMoreRow}>
					<Ionicons
						name="information-circle-outline"
						size={14}
						color={colors.textMuted}
					/>
					<Text style={[styles.learnMoreText, { color: colors.textMuted }]}>
						Questions about payouts?{" "}
						<Text
							style={{ color: colors.primary, fontWeight: "600" }}
							onPress={handleLearnMore}
						>
							Learn about Stripe Connect
						</Text>
					</Text>
				</View>
			</ScrollView>

			{/* ── CTA footer ─────────────────────────────────────────────── */}
			<View
				style={[
					styles.footer,
					{
						borderTopColor: colors.border,
						backgroundColor: colors.background,
					},
				]}
			>
				<PrimaryButton
					title={
						loading            ? "Opening Stripe…"
						: payoutStatus === "active"     ? "Manage Stripe Account"
						: payoutStatus === "pending"    ? "Check Stripe Status"
						: payoutStatus === "incomplete" ? "Complete Setup"
						: "Connect with Stripe"
					}
					onPress={handleStartOnboarding}
					disabled={loading}
				/>
				{loading && (
					<ActivityIndicator
						style={styles.footerSpinner}
						size="small"
						color={colors.primary}
					/>
				)}
				<Text style={[styles.footerNote, { color: colors.textMuted }]}>
					You'll be redirected to Stripe's secure website
				</Text>
			</View>
		</SafeAreaView>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1 },
	scroll: { padding: 20, paddingBottom: 120 },

	// Hero
	hero: { alignItems: "center", marginBottom: 20 },
	heroIcon: {
		width: 84,
		height: 84,
		borderRadius: 28,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	heroTitle: {
		fontSize: 26,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 10,
		textAlign: "center",
	},
	heroSubtitle: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: "center",
		maxWidth: 320,
	},

	// Status banner
	statusBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		marginBottom: 16,
	},
	statusLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
	statusHint:  { fontSize: 12, lineHeight: 17 },
	reqBadge: {
		width: 20, height: 20, borderRadius: 10,
		alignItems: "center", justifyContent: "center",
	},
	reqBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

	// Stripe badge
	stripeBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 24,
	},
	stripeBadgeText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 16 },

	// Features
	features: { gap: 10, marginBottom: 20 },
	featureCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
		padding: 14,
		marginBottom: 0,
	},
	featureIconWrap: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	featureTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
	featureBody: { fontSize: 13, lineHeight: 18 },

	// Steps
	stepsCard: {
		borderRadius: 18,
		borderWidth: 1,
		padding: 18,
		marginBottom: 16,
		gap: 14,
	},
	stepsTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
	stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
	stepNum: {
		width: 26,
		height: 26,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	stepNumText: { fontSize: 13, fontWeight: "800" },
	stepText: { flex: 1, fontSize: 13, lineHeight: 18, paddingTop: 4 },

	// Learn more
	learnMoreRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 6,
		marginBottom: 8,
	},
	learnMoreText: { flex: 1, fontSize: 12, lineHeight: 18 },

	// Footer
	footer: {
		padding: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		gap: 8,
	},
	footerSpinner: { position: "absolute", right: 24, bottom: 52 },
	footerNote: {
		fontSize: 12,
		textAlign: "center",
	},
});
