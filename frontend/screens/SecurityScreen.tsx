import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TextInput,
	Modal,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { ActiveSession } from "../types";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";

// ── Password strength ──────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
	if (!pw) return { level: 0, label: "" };
	let score = 0;
	if (pw.length >= 8) score++;
	if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
	if (/\d/.test(pw)) score++;
	if (/[^A-Za-z0-9]/.test(pw)) score++;
	if (score <= 1) return { level: 1, label: "Weak" };
	if (score === 2) return { level: 2, label: "Fair" };
	return { level: 3, label: "Strong" };
}

// ─────────────────────────────────────────────────────────────────────────────
export const SecurityScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { logout } = useAuth();
	const { showToast } = useToast();

	const [sessions, setSessions] = useState<ActiveSession[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const [deletePassword, setDeletePassword] = useState("");
	const [showDeletePw, setShowDeletePw] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const strength = getPasswordStrength(newPassword);
	const strengthColors = ["transparent", colors.danger, colors.amber, colors.green];

	useEffect(() => {
		loadSessions();
	}, []);

	const loadSessions = async () => {
		try {
			const res = await api.get<ActiveSession[]>("/users/sessions");
			setSessions(res.data);
		} catch {
			// silently ignore — the mock in api.ts will handle it
		} finally {
			setLoadingSessions(false);
		}
	};

	const handlePasswordChange = async () => {
		if (!currentPassword || !newPassword) return;
		if (newPassword.length < 8) {
			showToast("New password must be at least 8 characters", "error");
			return;
		}
		setIsChangingPassword(true);
		try {
			await api.post("/users/password/change", { currentPassword, newPassword });
			showToast("Password updated successfully", "success");
			setCurrentPassword("");
			setNewPassword("");
		} catch (e: any) {
			showToast(e?.response?.data?.message || "Failed to update password", "error");
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleLogoutAll = async () => {
		try {
			await api.post("/users/sessions/logout-all");
			showToast("Logged out of all other devices", "success");
			loadSessions();
		} catch {
			showToast("Failed to sign out other sessions", "error");
		}
	};

	const handleDeleteAccount = async () => {
		if (!deletePassword) return;
		setIsDeleting(true);
		try {
			await api.post("/users/delete", { password: deletePassword });
			setShowDeleteModal(false);
			await logout();
		} catch (e: any) {
			showToast(e?.response?.data?.message || "Failed to delete account", "error");
			setIsDeleting(false);
		}
	};

	const borderColor = isDarkMode ? "rgba(255,255,255,0.08)" : "#E2DDD6";

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: colors.background }]}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{/* ── Change Password ── */}
			<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
				CHANGE PASSWORD
			</Text>
			<Card style={styles.card}>
				{/* Current password */}
				<Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
					CURRENT PASSWORD
				</Text>
				<View style={[styles.inputRow, { borderColor, backgroundColor: colors.background }]}>
					<TextInput
						style={[styles.input, { color: colors.text }]}
						secureTextEntry={!showCurrent}
						value={currentPassword}
						onChangeText={setCurrentPassword}
						placeholder="Enter current password"
						placeholderTextColor={colors.textMuted}
					/>
					<TouchableOpacity onPress={() => setShowCurrent(v => !v)}>
						<Ionicons
							name={showCurrent ? "eye-off-outline" : "eye-outline"}
							size={20}
							color={colors.textMuted}
						/>
					</TouchableOpacity>
				</View>

				{/* New password */}
				<Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>
					NEW PASSWORD
				</Text>
				<View style={[styles.inputRow, { borderColor, backgroundColor: colors.background }]}>
					<TextInput
						style={[styles.input, { color: colors.text }]}
						secureTextEntry={!showNew}
						value={newPassword}
						onChangeText={setNewPassword}
						placeholder="At least 8 characters"
						placeholderTextColor={colors.textMuted}
					/>
					<TouchableOpacity onPress={() => setShowNew(v => !v)}>
						<Ionicons
							name={showNew ? "eye-off-outline" : "eye-outline"}
							size={20}
							color={colors.textMuted}
						/>
					</TouchableOpacity>
				</View>

				{/* Strength indicator */}
				{newPassword.length > 0 && (
					<View style={styles.strengthRow}>
						{[1, 2, 3].map(i => (
							<View
								key={i}
								style={[
									styles.strengthBar,
									{
										backgroundColor:
											i <= strength.level
												? strengthColors[strength.level]
												: colors.border,
									},
								]}
							/>
						))}
						<Text style={[styles.strengthLabel, { color: strengthColors[strength.level] }]}>
							{strength.label}
						</Text>
					</View>
				)}

				<PrimaryButton
					title="Update Password"
					onPress={handlePasswordChange}
					isLoading={isChangingPassword}
					disabled={!currentPassword || !newPassword || newPassword.length < 8}
					style={{ marginTop: 16 }}
				/>
			</Card>

			{/* ── Active Sessions ── */}
			<View style={styles.sectionHeaderRow}>
				<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
					ACTIVE SESSIONS
				</Text>
				<TouchableOpacity onPress={handleLogoutAll}>
					<Text style={[styles.logoutAll, { color: colors.danger }]}>Sign out all</Text>
				</TouchableOpacity>
			</View>
			<Card style={{ padding: 0, marginBottom: 24 }}>
				{loadingSessions ? (
					<ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
				) : (
					sessions.map((sess, idx) => (
						<View
							key={sess.id}
							style={[
								styles.sessionRow,
								idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
							]}
						>
							<View style={[styles.sessionIcon, { backgroundColor: colors.accentBg }]}>
								<Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
							</View>
							<View style={{ flex: 1 }}>
								<View style={styles.sessionDeviceRow}>
									<Text style={[styles.sessionDevice, { color: colors.text }]}>
										{sess.device}
									</Text>
									{sess.isCurrent && (
										<View
											style={[
												styles.currentBadge,
												{ backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
											]}
										>
											<Text style={[styles.currentBadgeText, { color: colors.green }]}>
												This device
											</Text>
										</View>
									)}
								</View>
								<Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
									{sess.location} · {sess.lastActive}
								</Text>
							</View>
						</View>
					))
				)}
			</Card>

			{/* ── Danger zone ── */}
			<Text style={[styles.sectionLabel, { color: colors.danger }]}>DANGER ZONE</Text>
			<View
				style={[
					styles.dangerCard,
					{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
				]}
			>
				<View style={[styles.dangerIconWrap, { backgroundColor: colors.danger + "20" }]}>
					<Ionicons name="warning-outline" size={22} color={colors.danger} />
				</View>
				<Text style={[styles.dangerTitle, { color: colors.danger }]}>Delete Account</Text>
				<Text style={[styles.dangerBody, { color: colors.textMuted }]}>
					Once deleted, your account and all associated data are permanently removed. This
					cannot be undone.
				</Text>
				<TouchableOpacity
					style={[styles.deleteBtn, { borderColor: colors.danger }]}
					onPress={() => setShowDeleteModal(true)}
					activeOpacity={0.7}
				>
					<Text style={[styles.deleteBtnText, { color: colors.danger }]}>
						Delete My Account
					</Text>
				</TouchableOpacity>
			</View>

			{/* ── Delete modal ── */}
			<Modal visible={showDeleteModal} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View
							style={[
								styles.modalIconWrap,
								{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
							]}
						>
							<Ionicons name="trash-outline" size={28} color={colors.danger} />
						</View>
						<Text style={[styles.modalTitle, { color: colors.text }]}>
							Delete Account?
						</Text>
						<Text style={[styles.modalBody, { color: colors.textMuted }]}>
							This action is permanent and cannot be undone. Enter your password to
							confirm.
						</Text>
						<View
							style={[
								styles.inputRow,
								{
									borderColor,
									backgroundColor: colors.background,
									marginBottom: 20,
									marginTop: 4,
								},
							]}
						>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								secureTextEntry={!showDeletePw}
								value={deletePassword}
								onChangeText={setDeletePassword}
								placeholder="Your password"
								placeholderTextColor={colors.textMuted}
							/>
							<TouchableOpacity onPress={() => setShowDeletePw(v => !v)}>
								<Ionicons
									name={showDeletePw ? "eye-off-outline" : "eye-outline"}
									size={20}
									color={colors.textMuted}
								/>
							</TouchableOpacity>
						</View>
						<View style={styles.modalActions}>
							<PrimaryButton
								title="Cancel"
								variant="secondary"
								onPress={() => { setShowDeleteModal(false); setDeletePassword(""); }}
								style={styles.modalBtn}
							/>
							<View style={{ width: 12 }} />
							<PrimaryButton
								title="Confirm Delete"
								variant="danger"
								onPress={handleDeleteAccount}
								isLoading={isDeleting}
								disabled={!deletePassword}
								style={styles.modalBtn}
							/>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 16, paddingBottom: 60 },

	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 10,
		marginLeft: 2,
	},
	sectionHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	logoutAll: { fontSize: 13, fontWeight: "700" },

	card: { padding: 16, marginBottom: 24 },

	fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 7 },
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		gap: 10,
	},
	input: { flex: 1, fontSize: 15, paddingVertical: 0 },

	strengthRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 10,
	},
	strengthBar: { flex: 1, height: 4, borderRadius: 2 },
	strengthLabel: { fontSize: 12, fontWeight: "700", minWidth: 48, textAlign: "right" },

	// Sessions
	sessionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 14,
	},
	sessionIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	sessionDeviceRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 3,
	},
	sessionDevice: { fontSize: 14, fontWeight: "600" },
	currentBadge: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 8,
		borderWidth: 1,
	},
	currentBadgeText: { fontSize: 10, fontWeight: "700" },
	sessionMeta: { fontSize: 12 },

	// Danger
	dangerCard: {
		borderRadius: 18,
		borderWidth: 1,
		padding: 18,
		marginBottom: 32,
		alignItems: "flex-start",
		gap: 10,
	},
	dangerIconWrap: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	dangerTitle: { fontSize: 15, fontWeight: "700" },
	dangerBody: { fontSize: 13, lineHeight: 19 },
	deleteBtn: {
		marginTop: 4,
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderRadius: 10,
		borderWidth: 1.5,
	},
	deleteBtnText: { fontSize: 14, fontWeight: "700" },

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.55)",
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	modalContent: {
		width: "100%",
		borderRadius: 24,
		padding: 24,
		alignItems: "center",
		gap: 10,
	},
	modalIconWrap: {
		width: 64,
		height: 64,
		borderRadius: 20,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	modalTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
	modalBody: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 8 },
	modalActions: { flexDirection: "row", width: "100%" },
	modalBtn: { flex: 1 },
});
