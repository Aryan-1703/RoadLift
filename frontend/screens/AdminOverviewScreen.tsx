import React, { useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface SettingsItem {
	label: string;
	sublabel: string;
	route: string;
	icon: IoniconsName;
	dark: { iconColor: string; iconBg: string };
	light: { iconColor: string; iconBg: string };
	badge?: string;
}

interface SettingsSection {
	title: string;
	items: SettingsItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminOverviewScreen = ({ navigation }: any) => {
	const { user, logout } = useAuth();
	const { isDarkMode, colors } = useTheme();
	const insets = useSafeAreaInsets();

	// Mount + theme-switch animation
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(28)).current;

	const runAnim = (fromY = 28, duration = 400) => {
		fadeAnim.setValue(0);
		slideAnim.setValue(fromY);
		Animated.parallel([
			Animated.timing(fadeAnim, { toValue: 1, duration, useNativeDriver: true }),
			Animated.timing(slideAnim, { toValue: 0, duration, useNativeDriver: true }),
		]).start();
	};

	useEffect(() => { runAnim(28, 420); }, []);
	useEffect(() => { runAnim(12, 260); }, [isDarkMode]);

	const isDriver = user?.role === "DRIVER";

	// ── Section data ─────────────────────────────────────────────────────────
	const sections: SettingsSection[] = [
		{
			title: "Account",
			items: [
				{
					label: "Edit Profile",
					sublabel: "Name, photo, contact info",
					route: "EditProfile",
					icon: "person-outline",
					dark: { iconColor: "#60a5fa", iconBg: "#1e3a5f" },
					light: { iconColor: "#1A6BFF", iconBg: "#DBEAFE" },
				},
				{
					label: "Security & Privacy",
					sublabel: "Password, 2FA, data settings",
					route: "Security",
					icon: "lock-closed-outline",
					dark: { iconColor: "#34d399", iconBg: "#064e3b" },
					light: { iconColor: "#0B7B56", iconBg: "#D1FAE5" },
				},
			],
		},
		{
			title: isDriver ? "Business & Payments" : "Mobility & Payments",
			items: [
				...(isDriver
					? []
					: [
							{
								label: "Manage Vehicles",
								sublabel: "Add or remove your vehicles",
								route: "ManageVehicles",
								icon: "car-sport-outline" as IoniconsName,
								dark: { iconColor: "#a78bfa", iconBg: "#2e1065" },
								light: { iconColor: "#7C3AED", iconBg: "#EDE9FE" },
							},
						]),
				{
					label: "Payment Methods",
					sublabel: "Cards, billing, history",
					route: "PaymentMethods",
					icon: "card-outline",
					dark: { iconColor: "#f59e0b", iconBg: "#451a03" },
					light: { iconColor: "#B87000", iconBg: "#FEF3C7" },
				},
			],
		},
		{
			title: "Preferences",
			items: [
				{
					label: "Appearance & Notifications",
					sublabel: "Theme, alerts, sounds",
					route: "Preferences",
					icon: "color-palette-outline",
					dark: { iconColor: "#fb7185", iconBg: "#4c0519" },
					light: { iconColor: "#D93025", iconBg: "#FFE4E6" },
				},
			],
		},
		{
			title: "Support & Legal",
			items: [
				{
					label: "Help Center",
					sublabel: "FAQs, live chat, support tickets",
					route: "HelpCenter",
					icon: "help-buoy-outline",
					dark: { iconColor: "#38bdf8", iconBg: "#082f49" },
					light: { iconColor: "#0284C7", iconBg: "#E0F2FE" },
				},
				{
					label: "Terms of Service",
					sublabel: "Usage policy and agreements",
					route: "Terms",
					icon: "document-text-outline",
					dark: { iconColor: "#94a3b8", iconBg: "#1e293b" },
					light: { iconColor: "#6D6359", iconBg: "#EDE9E2" },
				},
			],
		},
	];

	const stats = isDriver
		? [
				{ l: "Total Jobs", v: "—" },
				{ l: "Rating", v: "—" },
				{ l: "This Month", v: "—" },
			]
		: [
				{ l: "Total Trips", v: "—" },
				{ l: "Since", v: "2025" },
				{ l: "Saved", v: "—" },
			];

	// Derived from ThemeContext colors
	const avatarBg = isDarkMode ? "#1a3a6e" : "#DBEAFE";
	const avatarRingColor = isDarkMode ? "rgba(26,107,255,0.4)" : "rgba(26,107,255,0.2)";
	const onlineDotBorder = isDarkMode ? colors.card : "#FFFFFF";
	const glowBarColor = colors.primary;
	const editBtnBg = isDarkMode ? "rgba(96,165,250,0.1)" : colors.accentBg;
	const editBtnBorder = isDarkMode ? "rgba(96,165,250,0.2)" : colors.accentBorder;
	const editBtnIcon = isDarkMode ? "#60a5fa" : colors.primary;
	const logoutBg = colors.dangerBg;
	const logoutBorder = colors.dangerBorder;
	const logoutIconBg = colors.dangerIconBg;
	const logoutText = colors.danger;
	const logoutArrow = isDarkMode ? "#7f1d1d" : "#FCA5A5";

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
				]}
			>
				<Animated.View
					style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
				>
					{/* ── Profile card ── */}
					<View
						style={[
							styles.profileCard,
							{
								backgroundColor: colors.card,
								borderColor: colors.cardBorder,
								shadowColor: colors.shadowColor,
								shadowOpacity: colors.shadowOpacity as number,
							},
						]}
					>
						{/* Top accent bar */}
						<View style={[styles.glowBar, { backgroundColor: glowBarColor }]} />

						<View style={styles.profileRow}>
							{/* Avatar with ring + online dot */}
							<View>
								<View style={[styles.avatarRing, { borderColor: avatarRingColor }]}>
									<View style={[styles.avatar, { backgroundColor: avatarBg }]}>
										<Text style={[styles.avatarLetter, { color: colors.accentText }]}>
											{user?.name?.charAt(0)?.toUpperCase() || "?"}
										</Text>
									</View>
								</View>
								<View
									style={[
										styles.onlineDot,
										{
											backgroundColor: colors.green,
											borderColor: onlineDotBorder,
										},
									]}
								/>
							</View>

							{/* Name / email / badges */}
							<View style={styles.profileMeta}>
								<Text style={[styles.profileName, { color: colors.text }]}>
									{user?.name || "User"}
								</Text>
								<Text style={[styles.profileEmail, { color: colors.textMuted }]}>
									{user?.email}
								</Text>
								<View style={styles.badgeRow}>
									<View
										style={[
											styles.badge,
											{
												backgroundColor: colors.accentBg,
												borderColor: colors.accentBorder,
											},
										]}
									>
										<View style={[styles.badgeDot, { backgroundColor: colors.accent }]} />
										<Text style={[styles.badgeText, { color: colors.accentText }]}>
											{isDriver ? "Driver" : "Customer"}
										</Text>
									</View>
									{isDriver && (
										<View
											style={[
												styles.badge,
												{
													backgroundColor: colors.greenBg,
													borderColor: colors.greenBorder,
													marginLeft: 6,
												},
											]}
										>
											<Text style={[styles.badgeText, { color: colors.green }]}>
												Active
											</Text>
										</View>
									)}
								</View>
							</View>

							{/* Edit button */}
							<TouchableOpacity
								style={[
									styles.editBtn,
									{
										backgroundColor: editBtnBg,
										borderColor: editBtnBorder,
									},
								]}
								onPress={() => navigation.navigate("EditProfile")}
								activeOpacity={0.75}
							>
								<Ionicons name="pencil" size={15} color={editBtnIcon} />
							</TouchableOpacity>
						</View>

						{/* Stats row */}
						<View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
							{stats.map((s, i) => (
								<View
									key={s.l}
									style={[
										styles.statCell,
										i < stats.length - 1 && {
											borderRightWidth: 1,
											borderRightColor: colors.divider,
										},
									]}
								>
									<Text style={[styles.statValue, { color: colors.text }]}>{s.v}</Text>
									<Text style={[styles.statLabel, { color: colors.textFaint }]}>{s.l}</Text>
								</View>
							))}
						</View>
					</View>

					{/* ── Settings sections ── */}
					{sections.map((section, si) => (
						<View key={si} style={styles.section}>
							<Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
								{section.title}
							</Text>

							<View
								style={[
									styles.sectionCard,
									{
										backgroundColor: colors.card,
										borderColor: colors.cardBorder,
										shadowColor: colors.shadowColor,
										shadowOpacity: colors.shadowOpacity as number,
									},
								]}
							>
								{section.items.map((item, ii) => {
									const icon = isDarkMode ? item.dark : item.light;
									return (
										<TouchableOpacity
											key={ii}
											style={[
												styles.row,
												ii < section.items.length - 1 && {
													borderBottomWidth: 1,
													borderBottomColor: colors.divider,
												},
											]}
											onPress={() => navigation.navigate(item.route)}
											activeOpacity={0.65}
										>
											<View style={[styles.rowIcon, { backgroundColor: icon.iconBg }]}>
												<Ionicons name={item.icon} size={18} color={icon.iconColor} />
											</View>
											<View style={styles.rowTexts}>
												<Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
													{item.label}
												</Text>
												<Text style={[styles.rowSublabel, { color: colors.textFaint }]}>
													{item.sublabel}
												</Text>
											</View>
											{item.badge ? (
												<View
													style={[styles.rowBadge, { backgroundColor: colors.accent }]}
												>
													<Text style={styles.rowBadgeText}>{item.badge}</Text>
												</View>
											) : (
												<View style={[styles.rowArrow, { backgroundColor: colors.arrowBg }]}>
													<Ionicons
														name="chevron-forward"
														size={13}
														color={colors.arrowIcon}
													/>
												</View>
											)}
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					))}

					{/* ── Logout ── */}
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
							Account Actions
						</Text>
						<TouchableOpacity
							style={[
								styles.logoutRow,
								{
									backgroundColor: logoutBg,
									borderColor: logoutBorder,
								},
							]}
							onPress={logout}
							activeOpacity={0.75}
						>
							<View style={[styles.rowIcon, { backgroundColor: logoutIconBg }]}>
								<Ionicons name="log-out-outline" size={18} color={logoutText} />
							</View>
							<Text style={[styles.rowLabel, { color: logoutText, flex: 1 }]}>
								Log Out
							</Text>
							<View style={[styles.rowArrow, { backgroundColor: logoutBg }]}>
								<Ionicons name="chevron-forward" size={13} color={logoutArrow} />
							</View>
						</TouchableOpacity>
					</View>

					{/* ── Footer ── */}
					<View style={styles.footer}>
						<View style={styles.footerBrandRow}>
							<Ionicons name="flash" size={12} color={colors.footerBrand} />
							<Text style={[styles.footerBrandText, { color: colors.footerBrand }]}>
								RoadLift
							</Text>
						</View>
						<Text style={[styles.footerVersion, { color: colors.footerVersion }]}>
							Version 1.0.0 · Build 100
						</Text>
					</View>
				</Animated.View>
			</ScrollView>
		</View>
	);
};

// ── Geometry-only styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1 },
	content: { paddingHorizontal: 16 },

	// Profile card
	profileCard: {
		borderRadius: 24,
		borderWidth: 1,
		marginBottom: 28,
		overflow: "hidden",
		elevation: 6,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 14,
	},
	glowBar: { height: 2.5, opacity: 0.75 },
	profileRow: { flexDirection: "row", alignItems: "center", padding: 20, gap: 14 },

	avatarRing: { padding: 2.5, borderRadius: 40, borderWidth: 1.5 },
	avatar: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarLetter: { fontSize: 24, fontWeight: "800" },
	onlineDot: {
		position: "absolute",
		bottom: 1,
		right: 1,
		width: 12,
		height: 12,
		borderRadius: 6,
		borderWidth: 2,
	},

	profileMeta: { flex: 1 },
	profileName: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
	profileEmail: { fontSize: 13, marginTop: 2 },
	badgeRow: { flexDirection: "row", marginTop: 8 },
	badge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 20,
		borderWidth: 1,
	},
	badgeDot: { width: 5, height: 5, borderRadius: 3 },
	badgeText: {
		fontSize: 10,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	editBtn: {
		width: 34,
		height: 34,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	statsRow: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 14 },
	statCell: { flex: 1, alignItems: "center" },
	statValue: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
	statLabel: {
		fontSize: 10,
		marginTop: 3,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},

	// Sections
	section: { marginBottom: 20 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.9,
		marginBottom: 8,
		marginLeft: 4,
	},
	sectionCard: {
		borderRadius: 20,
		borderWidth: 1,
		overflow: "hidden",
		elevation: 3,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
	},

	// Row
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 16,
		gap: 14,
	},
	rowIcon: {
		width: 38,
		height: 38,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	rowTexts: { flex: 1 },
	rowLabel: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
	rowSublabel: { fontSize: 12, marginTop: 2 },
	rowArrow: {
		width: 24,
		height: 24,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	rowBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
	rowBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

	// Logout
	logoutRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 20,
		borderWidth: 1,
	},

	// Footer
	footer: { alignItems: "center", paddingTop: 16, gap: 6 },
	footerBrandRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	footerBrandText: { fontSize: 13, fontWeight: "700", letterSpacing: -0.2 },
	footerVersion: { fontSize: 11, fontWeight: "500" },
});
