import React from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface SettingsRow {
	label: string;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	screen?: string;
	onPress?: () => void;
	danger?: boolean;
	badge?: string;
}

interface SettingsSection {
	title: string;
	rows: SettingsRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const AdminOverviewScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { user, logout } = useAuth();
	const navigation = useNavigation<any>();

	const handleLogout = () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign Out",
				style: "destructive",
				onPress: async () => {
					await logout();
				},
			},
		]);
	};

	// ── Section config ─────────────────────────────────────────────────────────
	const customerSections: SettingsSection[] = [
		{
			title: "Account",
			rows: [
				{
					label: "Edit Profile",
					icon: "person-outline",
					screen: "EditProfile",
				},
				{
					label: "Payment Methods",
					icon: "card-outline",
					screen: "PaymentMethods",
				},
				{
					label: "My Vehicles",
					icon: "car-outline",
					screen: "ManageVehicles",
				},
				{
					label: "Job History",
					icon: "time-outline",
					screen: "JobHistory",
				},
			],
		},
		{
			title: "Preferences",
			rows: [
				{
					label: "Appearance & Notifications",
					icon: "color-palette-outline",
					screen: "Preferences",
				},
				{
					label: "Security & Privacy",
					icon: "shield-checkmark-outline",
					screen: "Security",
				},
			],
		},
		{
			title: "Support",
			rows: [
				{
					label: "Help Center",
					icon: "help-circle-outline",
					screen: "HelpCenter",
				},
				{
					label: "Terms of Service",
					icon: "document-text-outline",
					screen: "Terms",
				},
			],
		},
		{
			title: "Session",
			rows: [
				{
					label: "Sign Out",
					icon: "log-out-outline",
					onPress: handleLogout,
					danger: true,
				},
			],
		},
	];

	const driverSections: SettingsSection[] = [
		{
			title: "Account",
			rows: [
				{
					label: "Edit Profile",
					icon: "person-outline",
					screen: "EditProfile",
				},
				{
					label: "Stripe Payouts",
					icon: "wallet-outline",
					screen: "StripeOnboarding",
				},
				{
					label: "Job History",
					icon: "time-outline",
					screen: "JobHistory",
				},
			],
		},
		{
			title: "Preferences",
			rows: [
				{
					label: "Appearance & Notifications",
					icon: "color-palette-outline",
					screen: "Preferences",
				},
				{
					label: "Security & Privacy",
					icon: "shield-checkmark-outline",
					screen: "Security",
				},
			],
		},
		{
			title: "Support",
			rows: [
				{
					label: "Help Center",
					icon: "help-circle-outline",
					screen: "HelpCenter",
				},
				{
					label: "Terms of Service",
					icon: "document-text-outline",
					screen: "Terms",
				},
			],
		},
		{
			title: "Session",
			rows: [
				{
					label: "Sign Out",
					icon: "log-out-outline",
					onPress: handleLogout,
					danger: true,
				},
			],
		},
	];

	const sections = user?.role === "DRIVER" ? driverSections : customerSections;

	// ── Derived colors ─────────────────────────────────────────────────────────
	const avatarBg = isDarkMode ? "rgba(26,107,255,0.20)" : "rgba(26,107,255,0.10)";
	const sectionLabelColor = colors.sectionLabel;
	const rowBg = colors.card;
	const arrowColor = colors.arrowIcon;

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={styles.scroll}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Profile hero ── */}
				<View style={styles.hero}>
					<View style={[styles.avatar, { backgroundColor: avatarBg }]}>
						<Text style={[styles.avatarInitial, { color: colors.primary }]}>
							{user?.name?.charAt(0)?.toUpperCase() ?? "?"}
						</Text>
					</View>
					<Text style={[styles.heroName, { color: colors.text }]}>
						{user?.name ?? "—"}
					</Text>
					<View
						style={[
							styles.roleBadge,
							{
								backgroundColor:
									user?.role === "DRIVER" ? colors.greenBg : colors.accentBg,
								borderColor:
									user?.role === "DRIVER" ? colors.greenBorder : colors.accentBorder,
							},
						]}
					>
						<View
							style={[
								styles.roleDot,
								{
									backgroundColor:
										user?.role === "DRIVER" ? colors.green : colors.primary,
								},
							]}
						/>
						<Text
							style={[
								styles.roleLabel,
								{
									color: user?.role === "DRIVER" ? colors.green : colors.primary,
								},
							]}
						>
							{user?.role === "DRIVER" ? "Driver" : "Customer"}
						</Text>
					</View>
					<Text style={[styles.heroPhone, { color: colors.textMuted }]}>
						{user?.phone ?? user?.email ?? ""}
					</Text>
				</View>

				{/* ── Sections ── */}
				{sections.map(section => (
					<View key={section.title} style={styles.section}>
						<Text style={[styles.sectionLabel, { color: sectionLabelColor }]}>
							{section.title.toUpperCase()}
						</Text>

						<View
							style={[
								styles.sectionCard,
								{
									backgroundColor: rowBg,
									borderColor: colors.cardBorder,
								},
							]}
						>
							{section.rows.map((row, idx) => {
								const isLast = idx === section.rows.length - 1;
								const iconColor = row.danger ? colors.danger : colors.primary;
								const iconBg = row.danger ? colors.dangerIconBg : colors.accentBg;
								const labelColor = row.danger ? colors.danger : colors.text;

								return (
									<TouchableOpacity
										key={row.label}
										style={[
											styles.row,
											!isLast && {
												borderBottomWidth: StyleSheet.hairlineWidth,
												borderBottomColor: colors.divider,
											},
										]}
										activeOpacity={0.65}
										onPress={
											row.onPress
												? row.onPress
												: () => row.screen && navigation.navigate(row.screen)
										}
									>
										{/* Icon */}
										<View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
											<Ionicons name={row.icon} size={18} color={iconColor} />
										</View>

										{/* Label */}
										<Text style={[styles.rowLabel, { color: labelColor }]}>
											{row.label}
										</Text>

										{/* Badge (optional) */}
										{row.badge && (
											<View style={[styles.badge, { backgroundColor: colors.primary }]}>
												<Text style={styles.badgeText}>{row.badge}</Text>
											</View>
										)}

										{/* Chevron (hide for danger/logout) */}
										{!row.danger && (
											<View
												style={[styles.arrowWrap, { backgroundColor: colors.arrowBg }]}
											>
												<Ionicons name="chevron-forward" size={14} color={arrowColor} />
											</View>
										)}
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				))}

				{/* ── Footer ── */}
				<View style={styles.footer}>
					<Text style={[styles.footerBrand, { color: colors.footerBrand }]}>
						RoadLift
					</Text>
					<Text style={[styles.footerVersion, { color: colors.footerVersion }]}>
						Version 1.0.0
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1 },
	scroll: { paddingHorizontal: 16, paddingBottom: 48 },

	// Profile hero
	hero: {
		alignItems: "center",
		paddingTop: 28,
		paddingBottom: 32,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
	},
	avatarInitial: {
		fontSize: 32,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	heroName: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.4,
		marginBottom: 8,
	},
	roleBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 20,
		borderWidth: 1,
		marginBottom: 8,
	},
	roleDot: { width: 6, height: 6, borderRadius: 3 },
	roleLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
	heroPhone: { fontSize: 13 },

	// Section
	section: { marginBottom: 24 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 8,
		marginLeft: 4,
	},
	sectionCard: {
		borderRadius: 18,
		borderWidth: 1,
		overflow: "hidden",
	},

	// Row
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 14,
	},
	rowIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	rowLabel: {
		flex: 1,
		fontSize: 15,
		fontWeight: "500",
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
	},
	badgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	arrowWrap: {
		width: 24,
		height: 24,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},

	// Footer
	footer: {
		alignItems: "center",
		paddingTop: 8,
		gap: 4,
	},
	footerBrand: { fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
	footerVersion: { fontSize: 12 },
});
