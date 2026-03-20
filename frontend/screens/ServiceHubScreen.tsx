import React, { useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDriver } from "../context/DriverContext";
import type { ServiceState } from "../context/DriverContext";

// ── Service catalogue ─────────────────────────────────────────────────────────
const SERVICES: Array<{
	key:       "battery" | "lockout" | "fuel" | "tire";
	label:     string;
	icon:      "battery-charging-outline" | "key-outline" | "water-outline" | "disc-outline";
	equipment: string;
	color:     string;
}> = [
	{
		key:       "battery",
		label:     "Battery Boost",
		icon:      "battery-charging-outline",
		equipment: "jumper cables or a portable booster pack",
		color:     "#F59E0B",
	},
	{
		key:       "lockout",
		label:     "Door Lockout",
		icon:      "key-outline",
		equipment: "slim jim, wedge tool, or lockout kit",
		color:     "#3B82F6",
	},
	{
		key:       "fuel",
		label:     "Fuel Delivery",
		icon:      "water-outline",
		equipment: "approved fuel container (minimum 5L)",
		color:     "#10B981",
	},
	{
		key:       "tire",
		label:     "Tire Change",
		icon:      "disc-outline",
		equipment: "spare tire, jack, and lug wrench",
		color:     "#8B5CF6",
	},
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ svc, colors }: { svc: ServiceState; colors: any }) {
	if (svc.status === "approved") {
		return (
			<View style={[badge.wrap, { backgroundColor: (colors.green ?? "#059669") + "18" }]}>
				<Ionicons name="checkmark-circle" size={13} color={colors.green ?? "#059669"} />
				<Text style={[badge.text, { color: colors.green ?? "#059669" }]}>Approved</Text>
			</View>
		);
	}
	if (svc.status === "pending") {
		return (
			<View style={[badge.wrap, { backgroundColor: (colors.amber ?? "#F59E0B") + "18" }]}>
				<Ionicons name="time-outline" size={13} color={colors.amber ?? "#F59E0B"} />
				<Text style={[badge.text, { color: colors.amber ?? "#F59E0B" }]}>Under Review</Text>
			</View>
		);
	}
	if (svc.status === "rejected") {
		return (
			<View style={[badge.wrap, { backgroundColor: (colors.danger ?? "#EF4444") + "18" }]}>
				<Ionicons name="close-circle-outline" size={13} color={colors.danger ?? "#EF4444"} />
				<Text style={[badge.text, { color: colors.danger ?? "#EF4444" }]}>Rejected</Text>
			</View>
		);
	}
	return (
		<View style={[badge.wrap, { backgroundColor: colors.border + "60" }]}>
			<Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
			<Text style={[badge.text, { color: colors.textMuted }]}>Not Unlocked</Text>
		</View>
	);
}

const badge = StyleSheet.create({
	wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
	text: { fontSize: 11, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────────────────
export const ServiceHubScreen = () => {
	const { colors } = useTheme();
	const navigation = useNavigation<any>();
	const { unlockedServices, refreshServices, toggleService } = useDriver();

	const [loading,    setLoading]    = useState(!unlockedServices);
	const [refreshing, setRefreshing] = useState(false);
	// Track which service keys are mid-toggle to disable the switch during the request
	const [toggling,   setToggling]   = useState<Set<string>>(new Set());

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		await refreshServices();
		setLoading(false);
		setRefreshing(false);
	}, [refreshServices]);

	useEffect(() => { load(); }, [load]);

	const handleToggle = async (key: string, value: boolean) => {
		setToggling(prev => new Set(prev).add(key));
		await toggleService(key, value);
		setToggling(prev => { const n = new Set(prev); n.delete(key); return n; });
	};

	const approvedCount = unlockedServices
		? Object.values(unlockedServices).filter(s => s.status === "approved").length
		: 0;
	const enabledCount = unlockedServices
		? Object.values(unlockedServices).filter(s => s.status === "approved" && s.isEnabled).length
		: 0;

	if (loading) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => { setRefreshing(true); load(true); }}
						tintColor={colors.primary}
					/>
				}
			>
				{/* Header */}
				<View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Service Hub</Text>
					<Text style={[styles.headerSub, { color: colors.textMuted }]}>
						Unlock services by submitting equipment proof. Once approved, use the toggle to start receiving those job types.
					</Text>
					{approvedCount > 0 && (
						<View style={styles.chipRow}>
							<View style={[styles.chip, { backgroundColor: (colors.green ?? "#059669") + "18" }]}>
								<Ionicons name="checkmark-circle" size={13} color={colors.green ?? "#059669"} />
								<Text style={[styles.chipText, { color: colors.green ?? "#059669" }]}>
									{approvedCount} approved
								</Text>
							</View>
							{enabledCount > 0 && (
								<View style={[styles.chip, { backgroundColor: colors.primary + "18" }]}>
									<Ionicons name="radio-button-on" size={13} color={colors.primary} />
									<Text style={[styles.chipText, { color: colors.primary }]}>
										{enabledCount} active
									</Text>
								</View>
							)}
						</View>
					)}
				</View>

				{/* Service cards */}
				{SERVICES.map(svc => {
					const state: ServiceState = unlockedServices?.[svc.key] ?? { status: "unapproved", isEnabled: false };
					const isApproved = state.status === "approved";
					const isMidToggle = toggling.has(svc.key);

					return (
						<View
							key={svc.key}
							style={[
								styles.card,
								{
									backgroundColor: colors.card,
									borderColor: isApproved && state.isEnabled
										? (colors.green ?? "#059669") + "50"
										: colors.border,
									borderWidth: isApproved && state.isEnabled ? 1.5 : 1,
								},
							]}
						>
							{/* Top row: icon + info + badge */}
							<View style={styles.cardTop}>
								<View style={[styles.iconWrap, { backgroundColor: svc.color + "18" }]}>
									<Ionicons name={svc.icon} size={26} color={svc.color} />
								</View>
								<View style={styles.cardInfo}>
									<Text style={[styles.cardTitle, { color: colors.text }]}>{svc.label}</Text>
									<Text style={[styles.cardEquip, { color: colors.textMuted }]} numberOfLines={1}>
										Needs: {svc.equipment}
									</Text>
								</View>
								<StatusBadge svc={state} colors={colors} />
							</View>

							{/* Approved: show toggle row */}
							{isApproved ? (
								<View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
									<View style={{ flex: 1 }}>
										<Text style={[styles.toggleLabel, { color: colors.text }]}>
											Receive Jobs
										</Text>
										<Text style={[styles.toggleHint, { color: colors.textMuted }]}>
											{state.isEnabled
												? "You will be matched to " + svc.label.toLowerCase() + " requests"
												: "Toggle on to accept " + svc.label.toLowerCase() + " jobs"}
										</Text>
									</View>
									<Switch
										value={state.isEnabled}
										onValueChange={v => handleToggle(svc.key, v)}
										disabled={isMidToggle}
										trackColor={{ false: colors.border, true: colors.primary }}
										thumbColor={state.isEnabled ? "#fff" : colors.textMuted}
									/>
								</View>
							) : (
								/* Not approved: show upload / status CTA */
								<TouchableOpacity
									style={[
										styles.uploadBtn,
										{
											backgroundColor: state.status === "pending"
												? colors.border
												: state.status === "rejected"
													? (colors.danger ?? "#EF4444") + "18"
													: colors.primary,
											opacity: state.status === "pending" ? 0.6 : 1,
										},
									]}
									disabled={state.status === "pending"}
									activeOpacity={0.8}
									onPress={() =>
										navigation.navigate("EquipmentUpload", {
											serviceKey:   svc.key,
											serviceLabel: svc.label,
											equipment:    svc.equipment,
										})
									}
								>
									<Ionicons
										name={
											state.status === "pending"
												? "hourglass-outline"
												: state.status === "rejected"
													? "refresh-outline"
													: "cloud-upload-outline"
										}
										size={15}
										color={state.status === "rejected" ? (colors.danger ?? "#EF4444") : "#fff"}
										style={{ marginRight: 6 }}
									/>
									<Text style={[
										styles.uploadBtnText,
										{ color: state.status === "rejected" ? (colors.danger ?? "#EF4444") : "#fff" },
									]}>
										{state.status === "pending"
											? "Proof Submitted — Awaiting Review"
											: state.status === "rejected"
												? "Re-submit Equipment Proof"
												: "Submit Equipment Proof"}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					);
				})}

				<Text style={[styles.footer, { color: colors.textMuted }]}>
					Pull to refresh. Approvals are reviewed within 24 hours.
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center:    { flex: 1, alignItems: "center", justifyContent: "center" },
	scroll:    { padding: 16, paddingBottom: 40 },

	header:      { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
	headerTitle: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
	headerSub:   { fontSize: 14, lineHeight: 20 },
	chipRow:     { flexDirection: "row", gap: 8, marginTop: 12 },
	chip:        { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
	chipText:    { fontSize: 12, fontWeight: "700" },

	card:      { borderRadius: 16, padding: 16, marginBottom: 12 },
	cardTop:   { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	iconWrap:  { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0 },
	cardInfo:  { flex: 1, marginRight: 8 },
	cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
	cardEquip: { fontSize: 12, lineHeight: 17 },

	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		borderTopWidth: 1,
		paddingTop: 12,
		gap: 12,
	},
	toggleLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
	toggleHint:  { fontSize: 12, lineHeight: 17 },

	uploadBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 11,
		borderRadius: 12,
	},
	uploadBtnText: { fontWeight: "700", fontSize: 13 },

	footer: { fontSize: 12, textAlign: "center", marginTop: 8, fontStyle: "italic" },
});
