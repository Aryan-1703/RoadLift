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

// ── Theme tokens ──────────────────────────────────────────────────────────────
// All colours live here — the component stays colour-free below.
const T = {
	dark: {
		root: "#060b18",
		card: "#0d1424",
		cardBorder: "rgba(255,255,255,0.07)",
		text: "#ffffff",
		textSecondary: "#e2e8f0",
		textMuted: "#8a9ab5",
		textFaint: "#4d6080",
		sectionLabel: "#4d6080",
		divider: "rgba(255,255,255,0.07)",
		arrowBg: "rgba(255,255,255,0.04)",
		arrowIcon: "#3d4f6b",
		statValue: "#ffffff",
		accentBlue: "#1a6bff",
		accentBlueText: "#60a5fa",
		accentBlueBg: "rgba(26,107,255,0.15)",
		accentBlueBorder: "rgba(26,107,255,0.3)",
		accentGreen: "#34d399",
		accentGreenBg: "rgba(52,211,153,0.1)",
		accentGreenBorder: "rgba(52,211,153,0.25)",
		avatarBg: "#1a3a6e",
		avatarRing: "rgba(26,107,255,0.4)",
		onlineDotBorder: "#0d1424",
		glowBar: "#1a6bff",
		editBtnBg: "rgba(96,165,250,0.1)",
		editBtnBorder: "rgba(96,165,250,0.2)",
		editBtnIcon: "#60a5fa",
		logoutBg: "rgba(239,68,68,0.07)",
		logoutBorder: "rgba(239,68,68,0.18)",
		logoutIconBg: "rgba(239,68,68,0.1)",
		logoutText: "#f87171",
		logoutArrow: "#7f1d1d",
		footerBrand: "#1a6bff",
		footerVersion: "#2d3f57",
		shadowColor: "#000000",
		shadowOpacity: 0.25,
	},
	light: {
		root: "#f0f4f8",
		card: "#ffffff",
		cardBorder: "#e2e8f0",
		text: "#0f172a",
		textSecondary: "#1e293b",
		textMuted: "#64748b",
		textFaint: "#94a3b8",
		sectionLabel: "#94a3b8",
		divider: "#e2e8f0",
		arrowBg: "#f1f5f9",
		arrowIcon: "#cbd5e1",
		statValue: "#0f172a",
		accentBlue: "#1a6bff",
		accentBlueText: "#1a6bff",
		accentBlueBg: "rgba(26,107,255,0.08)",
		accentBlueBorder: "rgba(26,107,255,0.2)",
		accentGreen: "#059669",
		accentGreenBg: "rgba(5,150,105,0.08)",
		accentGreenBorder: "rgba(5,150,105,0.2)",
		avatarBg: "#dbeafe",
		avatarRing: "rgba(26,107,255,0.2)",
		onlineDotBorder: "#ffffff",
		glowBar: "#1a6bff",
		editBtnBg: "#eff6ff",
		editBtnBorder: "#bfdbfe",
		editBtnIcon: "#1a6bff",
		logoutBg: "#fff5f5",
		logoutBorder: "#fecaca",
		logoutIconBg: "#fee2e2",
		logoutText: "#ef4444",
		logoutArrow: "#fca5a5",
		footerBrand: "#1a6bff",
		footerVersion: "#cbd5e1",
		shadowColor: "#64748b",
		shadowOpacity: 0.08,
	},
} as const;

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminOverviewScreen = ({ navigation }: any) => {
	const { user, logout } = useAuth();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const c = isDarkMode ? T.dark : T.light; // active colour set

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

	useEffect(() => {
		runAnim(28, 420);
	}, []);
	useEffect(() => {
		runAnim(12, 260);
	}, [isDarkMode]);

	const isDriver = user?.role === "DRIVER";

	// ── Section data ───────────────────────────────────────────────────────────
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
					light: { iconColor: "#1a6bff", iconBg: "#dbeafe" },
				},
				{
					label: "Security & Privacy",
					sublabel: "Password, 2FA, data settings",
					route: "Security",
					icon: "lock-closed-outline",
					dark: { iconColor: "#34d399", iconBg: "#064e3b" },
					light: { iconColor: "#059669", iconBg: "#d1fae5" },
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
								light: { iconColor: "#7c3aed", iconBg: "#ede9fe" },
							},
						]),
				{
					label: "Payment Methods",
					sublabel: "Cards, billing, history",
					route: "PaymentMethods",
					icon: "card-outline",
					dark: { iconColor: "#f59e0b", iconBg: "#451a03" },
					light: { iconColor: "#d97706", iconBg: "#fef3c7" },
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
					light: { iconColor: "#e11d48", iconBg: "#ffe4e6" },
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
					light: { iconColor: "#0284c7", iconBg: "#e0f2fe" },
				},
				{
					label: "Terms of Service",
					sublabel: "Usage policy and agreements",
					route: "Terms",
					icon: "document-text-outline",
					dark: { iconColor: "#94a3b8", iconBg: "#1e293b" },
					light: { iconColor: "#64748b", iconBg: "#f1f5f9" },
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

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<View style={[styles.root, { backgroundColor: c.root }]}>
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
								backgroundColor: c.card,
								borderColor: c.cardBorder,
								shadowColor: c.shadowColor,
								shadowOpacity: c.shadowOpacity,
							},
						]}
					>
						{/* Blue top accent bar */}
						<View style={[styles.glowBar, { backgroundColor: c.glowBar }]} />

						<View style={styles.profileRow}>
							{/* Avatar with ring + online dot */}
							<View>
								<View style={[styles.avatarRing, { borderColor: c.avatarRing }]}>
									<View style={[styles.avatar, { backgroundColor: c.avatarBg }]}>
										<Text style={[styles.avatarLetter, { color: c.accentBlueText }]}>
											{user?.name?.charAt(0)?.toUpperCase() || "?"}
										</Text>
									</View>
								</View>
								<View
									style={[
										styles.onlineDot,
										{
											backgroundColor: c.accentGreen,
											borderColor: c.onlineDotBorder,
										},
									]}
								/>
							</View>

							{/* Name / email / badges */}
							<View style={styles.profileMeta}>
								<Text style={[styles.profileName, { color: c.text }]}>
									{user?.name || "User"}
								</Text>
								<Text style={[styles.profileEmail, { color: c.textMuted }]}>
									{user?.email}
								</Text>
								<View style={styles.badgeRow}>
									<View
										style={[
											styles.badge,
											{
												backgroundColor: c.accentBlueBg,
												borderColor: c.accentBlueBorder,
											},
										]}
									>
										<View style={[styles.badgeDot, { backgroundColor: c.accentBlue }]} />
										<Text style={[styles.badgeText, { color: c.accentBlueText }]}>
											{isDriver ? "Driver" : "Customer"}
										</Text>
									</View>
									{isDriver && (
										<View
											style={[
												styles.badge,
												{
													backgroundColor: c.accentGreenBg,
													borderColor: c.accentGreenBorder,
													marginLeft: 6,
												},
											]}
										>
											<Text style={[styles.badgeText, { color: c.accentGreen }]}>
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
										backgroundColor: c.editBtnBg,
										borderColor: c.editBtnBorder,
									},
								]}
								onPress={() => navigation.navigate("EditProfile")}
								activeOpacity={0.75}
							>
								<Ionicons name="pencil" size={15} color={c.editBtnIcon} />
							</TouchableOpacity>
						</View>

						{/* Stats row */}
						<View style={[styles.statsRow, { borderTopColor: c.divider }]}>
							{stats.map((s, i) => (
								<View
									key={s.l}
									style={[
										styles.statCell,
										i < stats.length - 1 && {
											borderRightWidth: 1,
											borderRightColor: c.divider,
										},
									]}
								>
									<Text style={[styles.statValue, { color: c.statValue }]}>{s.v}</Text>
									<Text style={[styles.statLabel, { color: c.textFaint }]}>{s.l}</Text>
								</View>
							))}
						</View>
					</View>

					{/* ── Setting sections ── */}
					{sections.map((section, si) => (
						<View key={si} style={styles.section}>
							<Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
								{section.title}
							</Text>

							<View
								style={[
									styles.sectionCard,
									{
										backgroundColor: c.card,
										borderColor: c.cardBorder,
										shadowColor: c.shadowColor,
										shadowOpacity: c.shadowOpacity,
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
													borderBottomColor: c.divider,
												},
											]}
											onPress={() => navigation.navigate(item.route)}
											activeOpacity={0.65}
										>
											<View style={[styles.rowIcon, { backgroundColor: icon.iconBg }]}>
												<Ionicons name={item.icon} size={18} color={icon.iconColor} />
											</View>
											<View style={styles.rowTexts}>
												<Text style={[styles.rowLabel, { color: c.textSecondary }]}>
													{item.label}
												</Text>
												<Text style={[styles.rowSublabel, { color: c.textFaint }]}>
													{item.sublabel}
												</Text>
											</View>
											{item.badge ? (
												<View
													style={[styles.rowBadge, { backgroundColor: c.accentBlue }]}
												>
													<Text style={styles.rowBadgeText}>{item.badge}</Text>
												</View>
											) : (
												<View style={[styles.rowArrow, { backgroundColor: c.arrowBg }]}>
													<Ionicons
														name="chevron-forward"
														size={13}
														color={c.arrowIcon}
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
						<Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
							Account Actions
						</Text>
						<TouchableOpacity
							style={[
								styles.logoutRow,
								{
									backgroundColor: c.logoutBg,
									borderColor: c.logoutBorder,
								},
							]}
							onPress={logout}
							activeOpacity={0.75}
						>
							<View style={[styles.rowIcon, { backgroundColor: c.logoutIconBg }]}>
								<Ionicons name="log-out-outline" size={18} color={c.logoutText} />
							</View>
							<Text style={[styles.rowLabel, { color: c.logoutText, flex: 1 }]}>
								Log Out
							</Text>
							<View style={[styles.rowArrow, { backgroundColor: c.logoutBg }]}>
								<Ionicons name="chevron-forward" size={13} color={c.logoutArrow} />
							</View>
						</TouchableOpacity>
					</View>

					{/* ── Footer ── */}
					<View style={styles.footer}>
						<View style={styles.footerBrandRow}>
							<Ionicons name="flash" size={12} color={c.footerBrand} />
							<Text style={[styles.footerBrandText, { color: c.footerBrand }]}>
								RoadLift
							</Text>
						</View>
						<Text style={[styles.footerVersion, { color: c.footerVersion }]}>
							Version 1.0.0 · Build 100
						</Text>
					</View>
				</Animated.View>
			</ScrollView>
		</View>
	);
};

// ── Geometry-only styles (zero colour values) ─────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1 },
	content: { paddingHorizontal: 16 },

	pageTitle: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginBottom: 20 },

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
