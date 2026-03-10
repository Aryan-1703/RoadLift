import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface HistoryJob {
	id: number | string;
	serviceType: string;
	status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
	estimatedCost?: number | null;
	createdAt: string;
	// Populated from association
	customer?: { id: number; name: string };
	driver?: { id: number; name: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_LABELS: Record<string, string> = {
	towing: "Towing",
	"tire-change": "Tire Change",
	"car-lockout": "Lockout",
	"fuel-delivery": "Fuel Delivery",
	"battery-boost": "Battery Boost",
};

const SERVICE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
	towing: "car",
	"tire-change": "disc-outline",
	"car-lockout": "key-outline",
	"fuel-delivery": "water-outline",
	"battery-boost": "flash-outline",
};

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("en-CA", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge config
// ─────────────────────────────────────────────────────────────────────────────
function useStatusConfig(status: HistoryJob["status"], colors: any, isDarkMode: boolean) {
	const configs = {
		completed: {
			label: "Completed",
			color: colors.green,
			bg: colors.greenBg,
			border: colors.greenBorder,
			icon: "checkmark-circle" as const,
		},
		cancelled: {
			label: "Cancelled",
			color: colors.danger,
			bg: colors.dangerBg,
			border: colors.dangerBorder,
			icon: "close-circle" as const,
		},
		accepted: {
			label: "Accepted",
			color: colors.primary,
			bg: colors.accentBg,
			border: colors.accentBorder,
			icon: "time" as const,
		},
		in_progress: {
			label: "In Progress",
			color: colors.amber,
			bg: colors.amberBg,
			border: colors.amberBorder,
			icon: "ellipsis-horizontal-circle" as const,
		},
		pending: {
			label: "Pending",
			color: colors.textMuted,
			bg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(27,25,22,0.05)",
			border: colors.border,
			icon: "hourglass-outline" as const,
		},
	};
	return configs[status] ?? configs.pending;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job card
// ─────────────────────────────────────────────────────────────────────────────
const JobCard = ({
	job,
	role,
	colors,
	isDarkMode,
}: {
	job: HistoryJob;
	role: string;
	colors: any;
	isDarkMode: boolean;
}) => {
	const status = useStatusConfig(job.status, colors, isDarkMode);
	const serviceLabel = SERVICE_LABELS[job.serviceType] ?? job.serviceType;
	const serviceIcon = SERVICE_ICONS[job.serviceType] ?? "build-outline";

	const counterpartyLabel = role === "DRIVER" ? job.customer?.name : job.driver?.name;

	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: colors.card, borderColor: colors.cardBorder },
			]}
		>
			{/* Top row — service + status */}
			<View style={styles.cardTop}>
				{/* Service icon */}
				<View style={[styles.serviceIcon, { backgroundColor: colors.accentBg }]}>
					<Ionicons name={serviceIcon} size={18} color={colors.primary} />
				</View>

				<View style={{ flex: 1 }}>
					<Text style={[styles.serviceLabel, { color: colors.text }]}>
						{serviceLabel}
					</Text>
					<Text style={[styles.dateText, { color: colors.textMuted }]}>
						{formatDate(job.createdAt)} · {formatTime(job.createdAt)}
					</Text>
				</View>

				{/* Status badge */}
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: status.bg, borderColor: status.border },
					]}
				>
					<Ionicons name={status.icon} size={12} color={status.color} />
					<Text style={[styles.statusText, { color: status.color }]}>
						{status.label}
					</Text>
				</View>
			</View>

			{/* Bottom row — counterparty + cost */}
			<View style={[styles.cardBottom, { borderTopColor: colors.divider }]}>
				{counterpartyLabel ? (
					<View style={styles.personRow}>
						<Ionicons name="person-outline" size={13} color={colors.textMuted} />
						<Text style={[styles.personText, { color: colors.textMuted }]}>
							{role === "DRIVER" ? "Customer: " : "Driver: "}
							<Text style={{ color: colors.text, fontWeight: "600" }}>
								{counterpartyLabel}
							</Text>
						</Text>
					</View>
				) : (
					<Text style={[styles.personText, { color: colors.textMuted }]}>
						{role === "DRIVER" ? "No customer info" : "No driver assigned"}
					</Text>
				)}

				{job.estimatedCost != null && (
					<Text style={[styles.costText, { color: colors.text }]}>
						<Text style={{ color: colors.primary, fontSize: 12 }}>$</Text>
						{Number(job.estimatedCost).toFixed(2)}
					</Text>
				)}
			</View>
		</View>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export const JobHistoryScreen = () => {
	const { colors, isDarkMode } = useTheme();
	const { user } = useAuth();

	const [jobs, setJobs] = useState<HistoryJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");
	const [error, setError] = useState<string | null>(null);

	const fetchJobs = useCallback(async () => {
		try {
			setError(null);
			// Uses the unified jobs endpoint; backend filters by userId via JWT
			const endpoint =
				user?.role === "DRIVER" ? "/driver/jobs/history" : "/jobs/history";
			const res = await api.get<HistoryJob[]>(endpoint);
			setJobs(Array.isArray(res.data) ? res.data : []);
		} catch (e: any) {
			// Graceful degradation — show empty state instead of crash
			console.warn("JobHistory fetch failed:", e?.message);
			setJobs([]);
			if (e?.response?.status !== 404) {
				setError("Could not load job history.");
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [user?.role]);

	useEffect(() => {
		fetchJobs();
	}, [fetchJobs]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchJobs();
	};

	const filteredJobs = jobs.filter(j => {
		if (filter === "all") return true;
		return j.status === filter;
	});

	// Stats
	const completedCount = jobs.filter(j => j.status === "completed").length;
	const totalSpent = jobs
		.filter(j => j.status === "completed")
		.reduce((sum, j) => sum + Number(j.estimatedCost ?? 0), 0);

	// ── Filter chip ──────────────────────────────────────────────────────────
	const FilterChip = ({
		value,
		label,
	}: {
		value: typeof filter;
		label: string;
	}) => {
		const active = filter === value;
		return (
			<TouchableOpacity
				style={[
					styles.chip,
					{
						backgroundColor: active
							? colors.primary
							: isDarkMode
								? "rgba(255,255,255,0.06)"
								: "rgba(27,25,22,0.05)",
						borderColor: active ? colors.primary : colors.border,
					},
				]}
				onPress={() => setFilter(value)}
				activeOpacity={0.7}
			>
				<Text
					style={[
						styles.chipText,
						{ color: active ? "#fff" : colors.textMuted },
					]}
				>
					{label}
				</Text>
			</TouchableOpacity>
		);
	};

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
			{/* Stats banner — only for customers with history */}
			{!loading && completedCount > 0 && user?.role === "CUSTOMER" && (
				<View
					style={[
						styles.statsBanner,
						{ backgroundColor: colors.card, borderBottomColor: colors.border },
					]}
				>
					<View style={styles.stat}>
						<Text style={[styles.statValue, { color: colors.text }]}>
							{completedCount}
						</Text>
						<Text style={[styles.statLabel, { color: colors.textMuted }]}>
							Jobs Completed
						</Text>
					</View>
					<View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
					<View style={styles.stat}>
						<Text style={[styles.statValue, { color: colors.text }]}>
							${totalSpent.toFixed(2)}
						</Text>
						<Text style={[styles.statLabel, { color: colors.textMuted }]}>
							Total Spent
						</Text>
					</View>
				</View>
			)}

			{/* Filter chips */}
			<View
				style={[
					styles.filterRow,
					{ borderBottomColor: colors.border, backgroundColor: colors.card },
				]}
			>
				<FilterChip value="all" label="All" />
				<FilterChip value="completed" label="Completed" />
				<FilterChip value="cancelled" label="Cancelled" />
			</View>

			{/* Content */}
			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : error ? (
				<View style={styles.center}>
					<Ionicons name="wifi-outline" size={40} color={colors.textMuted} />
					<Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>
						{error}
					</Text>
					<TouchableOpacity onPress={fetchJobs} style={styles.retryBtn}>
						<Text style={[styles.retryText, { color: colors.primary }]}>Try Again</Text>
					</TouchableOpacity>
				</View>
			) : filteredJobs.length === 0 ? (
				<View style={styles.center}>
					<View
						style={[styles.emptyIconWrap, { backgroundColor: colors.surface }]}
					>
						<Ionicons name="time-outline" size={36} color={colors.textMuted} />
					</View>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>
						{filter === "all" ? "No jobs yet" : `No ${filter} jobs`}
					</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
						{filter === "all"
							? "Your job history will appear here."
							: "Try a different filter."}
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredJobs}
					keyExtractor={item => String(item.id)}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={colors.primary}
						/>
					}
					renderItem={({ item }) => (
						<JobCard
							job={item}
							role={user?.role ?? "CUSTOMER"}
							colors={colors}
							isDarkMode={isDarkMode}
						/>
					)}
				/>
			)}
		</SafeAreaView>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	root: { flex: 1 },

	// Stats banner
	statsBanner: {
		flexDirection: "row",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	stat: { flex: 1, alignItems: "center" },
	statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
	statLabel: { fontSize: 12, marginTop: 2 },
	statDivider: { width: 1, marginHorizontal: 16 },

	// Filter row
	filterRow: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	chip: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1,
	},
	chipText: { fontSize: 13, fontWeight: "600" },

	// List
	list: { padding: 16, gap: 10 },

	// Card
	card: {
		borderRadius: 18,
		borderWidth: 1,
		overflow: "hidden",
	},
	cardTop: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 14,
	},
	serviceIcon: {
		width: 42,
		height: 42,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
	},
	serviceLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
	dateText: { fontSize: 12 },
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		borderWidth: 1,
	},
	statusText: { fontSize: 11, fontWeight: "700" },

	cardBottom: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	personRow: { flexDirection: "row", alignItems: "center", gap: 5 },
	personText: { fontSize: 12 },
	costText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },

	// Empty / loading
	center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
	emptyIconWrap: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" },
	emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
	retryBtn: { marginTop: 16 },
	retryText: { fontSize: 14, fontWeight: "700" },
});
