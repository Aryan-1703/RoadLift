import React, { useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceStatus = "unapproved" | "pending" | "approved";

interface UnlockedServices {
	battery: ServiceStatus;
	lockout:  ServiceStatus;
	fuel:     ServiceStatus;
	tire:     ServiceStatus;
}

// ── Service catalogue ─────────────────────────────────────────────────────────
const SERVICES = [
	{
		key:       "battery" as const,
		label:     "Battery Boost",
		icon:      "battery-charging-outline" as const,
		equipment: "jumper cables or a portable booster pack",
		color:     "#F59E0B",
	},
	{
		key:       "lockout" as const,
		label:     "Door Lockout",
		icon:      "key-outline" as const,
		equipment: "slim jim, wedge tool, or lockout kit",
		color:     "#3B82F6",
	},
	{
		key:       "fuel" as const,
		label:     "Fuel Delivery",
		icon:      "water-outline" as const,
		equipment: "approved fuel container (minimum 5L)",
		color:     "#10B981",
	},
	{
		key:       "tire" as const,
		label:     "Tire Change",
		icon:      "disc-outline" as const,
		equipment: "spare tire, jack, and lug wrench",
		color:     "#8B5CF6",
	},
];

// ── Status badge config ───────────────────────────────────────────────────────
function statusBadge(status: ServiceStatus, colors: any) {
	switch (status) {
		case "approved":
			return { icon: "checkmark-circle" as const, color: colors.green ?? "#059669", label: "Approved", bg: (colors.green ?? "#059669") + "18" };
		case "pending":
			return { icon: "time-outline" as const, color: colors.amber ?? "#F59E0B", label: "Under Review", bg: (colors.amber ?? "#F59E0B") + "18" };
		default:
			return { icon: "lock-closed-outline" as const, color: colors.textMuted, label: "Not Unlocked", bg: colors.border + "60" };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
export const ServiceHubScreen = () => {
	const { colors } = useTheme();
	const navigation = useNavigation<any>();

	const [services, setServices]   = useState<UnlockedServices | null>(null);
	const [loading,  setLoading]    = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		try {
			const res = await api.get<{ unlockedServices: UnlockedServices }>("/driver/services");
			setServices(res.data.unlockedServices);
		} catch {
			// silently fail — retry on pull-to-refresh
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const approvedCount = services
		? Object.values(services).filter(s => s === "approved").length
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
						Unlock services by submitting proof of equipment. Each service is reviewed within 24 hours.
					</Text>
					{approvedCount > 0 && (
						<View style={[styles.approvedChip, { backgroundColor: (colors.green ?? "#059669") + "18" }]}>
							<Ionicons name="checkmark-circle" size={14} color={colors.green ?? "#059669"} />
							<Text style={[styles.approvedChipText, { color: colors.green ?? "#059669" }]}>
								{approvedCount} service{approvedCount > 1 ? "s" : ""} unlocked
							</Text>
						</View>
					)}
				</View>

				{/* Service cards */}
				{SERVICES.map(svc => {
					const status = services?.[svc.key] ?? "unapproved";
					const badge  = statusBadge(status, colors);

					return (
						<View
							key={svc.key}
							style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
						>
							<View style={styles.cardRow}>
								{/* Service icon */}
								<View style={[styles.iconWrap, { backgroundColor: svc.color + "18" }]}>
									<Ionicons name={svc.icon} size={26} color={svc.color} />
								</View>

								{/* Name + equipment hint */}
								<View style={styles.cardInfo}>
									<Text style={[styles.cardTitle, { color: colors.text }]}>{svc.label}</Text>
									<Text style={[styles.cardEquip, { color: colors.textMuted }]}>
										Required: {svc.equipment}
									</Text>
								</View>

								{/* Status badge */}
								<View style={[styles.badge, { backgroundColor: badge.bg }]}>
									<Ionicons name={badge.icon} size={14} color={badge.color} />
									<Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
								</View>
							</View>

							{/* CTA — only show if not yet approved */}
							{status !== "approved" && (
								<TouchableOpacity
									style={[
										styles.uploadBtn,
										{
											backgroundColor: status === "pending" ? colors.border : colors.primary,
											opacity: status === "pending" ? 0.6 : 1,
										},
									]}
									disabled={status === "pending"}
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
										name={status === "pending" ? "hourglass-outline" : "cloud-upload-outline"}
										size={16}
										color="#fff"
										style={{ marginRight: 6 }}
									/>
									<Text style={styles.uploadBtnText}>
										{status === "pending" ? "Proof Submitted — Awaiting Review" : "Submit Equipment Proof"}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					);
				})}

				<Text style={[styles.footer, { color: colors.textMuted }]}>
					Pull down to refresh status. Approvals are sent by email once reviewed.
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center:    { flex: 1, alignItems: "center", justifyContent: "center" },
	scroll:    { padding: 16, paddingBottom: 40 },

	header: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		marginBottom: 16,
	},
	headerTitle: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
	headerSub:   { fontSize: 14, lineHeight: 20 },
	approvedChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		marginTop: 12,
	},
	approvedChipText: { fontSize: 12, fontWeight: "700" },

	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		marginBottom: 12,
	},
	cardRow:   { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	iconWrap:  { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
	cardInfo:  { flex: 1 },
	cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
	cardEquip: { fontSize: 12, lineHeight: 17 },

	badge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
	},
	badgeText: { fontSize: 11, fontWeight: "700" },

	uploadBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 11,
		borderRadius: 12,
	},
	uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

	footer: { fontSize: 12, textAlign: "center", marginTop: 8, fontStyle: "italic" },
});
