import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useDriver } from "../context/DriverContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { useNavigation } from "@react-navigation/native";
import { Job } from "../types";

/** Strips street number, keeps street name + city. "12 Main St, Toronto, ON" → "Main St area, Toronto" */
function maskAddress(address: string | null | undefined): string {
	if (!address) return "Unknown area";
	// Split on commas — first part is street, rest is city/province/postal
	const parts = address.split(",").map(p => p.trim());
	const street = parts[0] ?? "";
	const city   = parts[1] ?? "";
	// Remove leading digits (the house number)
	const streetNoNumber = street.replace(/^\d+\s*/, "").trim();
	const area = streetNoNumber ? `${streetNoNumber} area` : "Nearby area";
	return city ? `${area}, ${city}` : area;
}

/** Haversine distance in km between two lat/lng points */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
		Math.cos((lat2 * Math.PI) / 180) *
		Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns "~X min" ETA string, or null if location unavailable */
function calcEta(
	driverLat: number | null,
	driverLng: number | null,
	job: Job,
): string | null {
	if (driverLat == null || driverLng == null) return null;
	const jobLat = job.customerLocation?.latitude;
	const jobLng = job.customerLocation?.longitude;
	if (jobLat == null || jobLng == null) return null;
	const km = distanceKm(driverLat, driverLng, jobLat, jobLng);
	const minutes = Math.round((km / 40) * 60); // assume 40 km/h average city speed
	return minutes <= 1 ? "< 1 min" : `~${minutes} min`;
}

export const DriverDashboardScreen = () => {
	const {
		isOnline,
		goOnline,
		goOffline,
		availableJobs,
		fetchAvailableJobs,
		acceptJob,
		rejectJob,
		earnings,
		fetchEarnings,
		unlockedServices,
	} = useDriver();
	const { colors, isDarkMode } = useTheme();
	const navigation = useNavigation<any>();

	const hasApprovedService = unlockedServices
		? Object.values(unlockedServices).some(s => s === "approved")
		: false;
	const [refreshing, setRefreshing] = useState(false);
	const [checkingForJobs, setCheckingForJobs] = useState(false);
	const [driverLat, setDriverLat] = useState<number | null>(null);
	const [driverLng, setDriverLng] = useState<number | null>(null);

	// ── Decline tracking — persists for the session so polls don't resurface jobs ──
	const declinedJobIdsRef = useRef<Set<string>>(new Set());

	const handleDecline = (jobId: string) => {
		declinedJobIdsRef.current.add(jobId);
		// Clean up any glow timer for this job
		const t = glowTimerRefs.current.get(jobId);
		if (t) { clearTimeout(t); glowTimerRefs.current.delete(jobId); }
		setNewJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
		rejectJob(jobId);
	};

	// Filter out declined jobs before rendering (survives poll refreshes)
	const visibleJobs = availableJobs.filter(j => !declinedJobIdsRef.current.has(String(j.id)));

	// ── New-job glow tracking ─────────────────────────────────────────────────
	const NEW_JOB_GLOW_MS = 45_000;
	const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set());
	const prevJobIdsRef  = useRef<Set<string>>(new Set());
	const glowTimerRefs  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
	const badgeAnim      = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		fetchEarnings();
	}, [fetchEarnings]);

	// Track driver location for ETA calculation
	useEffect(() => {
		let sub: Location.LocationSubscription | null = null;
		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") return;
			sub = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
				loc => {
					setDriverLat(loc.coords.latitude);
					setDriverLng(loc.coords.longitude);
				},
			);
		})();
		return () => { sub?.remove(); };
	}, []);

	// When going online, briefly show skeleton cards while jobs load in
	useEffect(() => {
		if (isOnline) {
			setCheckingForJobs(true);
			const t = setTimeout(() => setCheckingForJobs(false), 1800);
			return () => clearTimeout(t);
		}
	}, [isOnline]);

	// Detect newly arrived jobs and mark them as "new" for NEW_JOB_GLOW_MS.
	// Timers are stored in glowTimerRefs so a refresh (which re-runs this effect)
	// does NOT cancel the countdown that already started.
	useEffect(() => {
		const currentIds = new Set(availableJobs.map(j => String(j.id)));
		const addedIds: string[] = [];
		currentIds.forEach(id => {
			if (!prevJobIdsRef.current.has(id)) addedIds.push(id);
		});
		prevJobIdsRef.current = currentIds;
		if (addedIds.length === 0) return;

		setNewJobIds(prev => {
			const next = new Set(prev);
			addedIds.forEach(id => next.add(id));
			return next;
		});

		// One timer per job ID — stored outside the effect so re-runs don't cancel them
		addedIds.forEach(id => {
			if (glowTimerRefs.current.has(id)) return; // already counting down
			const timer = setTimeout(() => {
				setNewJobIds(prev => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
				glowTimerRefs.current.delete(id);
			}, NEW_JOB_GLOW_MS);
			glowTimerRefs.current.set(id, timer);
		});
	}, [availableJobs]);

	// Clear all glow timers on unmount
	useEffect(() => {
		return () => {
			glowTimerRefs.current.forEach(t => clearTimeout(t));
		};
	}, []);

	// Pulse the NEW badge while any new jobs are present
	useEffect(() => {
		if (newJobIds.size > 0) {
			const pulse = Animated.loop(
				Animated.sequence([
					Animated.timing(badgeAnim, { toValue: 0.25, duration: 550, useNativeDriver: true }),
					Animated.timing(badgeAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
				]),
			);
			pulse.start();
			return () => pulse.stop();
		} else {
			badgeAnim.setValue(1);
		}
	}, [newJobIds.size, badgeAnim]);

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchAvailableJobs();
		await fetchEarnings();
		setRefreshing(false);
	};

	const onlineColor  = colors.green;
	const onlineBg     = colors.greenBg;
	const onlineBorder = colors.greenBorder;
	const offlineBg    = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(27,25,22,0.05)";
	const offlineBorder = colors.border;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View
				style={[
					styles.header,
					{ borderBottomColor: colors.border, backgroundColor: colors.card },
				]}
			>
				<View>
					<Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
					<View style={styles.statusRow}>
						<View
							style={[
								styles.statusIndicator,
								{ backgroundColor: isOnline ? onlineColor : colors.offline },
							]}
						/>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							{isOnline ? "Online · Visible to customers" : "Offline"}
						</Text>
					</View>
				</View>
				<TouchableOpacity
					onPress={() => navigation.navigate("SettingsNav")}
					style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
				>
					<Ionicons name="settings-outline" size={20} color={colors.text} />
				</TouchableOpacity>
			</View>

			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={colors.primary}
					/>
				}
			>
				{/* Status Toggle */}
				<View
					style={[
						styles.statusCard,
						{
							backgroundColor: isOnline ? onlineBg : offlineBg,
							borderColor: isOnline ? onlineBorder : offlineBorder,
						},
					]}
				>
					<View style={styles.statusLeft}>
						<View
							style={[
								styles.statusDot,
								{ backgroundColor: isOnline ? onlineColor : colors.offline },
							]}
						/>
						<View>
							<Text style={[styles.statusText, { color: colors.text }]}>
								{isOnline ? "You're Online" : "You're Offline"}
							</Text>
							<Text style={[styles.statusHint, { color: colors.textMuted }]}>
								{isOnline
									? "New requests will appear below"
									: "Go online to start accepting jobs"}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						style={[
							styles.toggleBtn,
							{
								backgroundColor: isOnline ? colors.dangerBg : colors.greenBg,
								borderColor: isOnline ? colors.dangerBorder : colors.greenBorder,
							},
						]}
						onPress={isOnline ? goOffline : () => {
						if (!hasApprovedService) {
							navigation.navigate("SettingsNav", { screen: "ServiceHub" });
						} else {
							goOnline();
						}
					}}
					>
						<Text
							style={[
								styles.toggleText,
								{ color: isOnline ? colors.danger : colors.green },
							]}
						>
							{isOnline ? "Go Offline" : "Go Online"}
						</Text>
					</TouchableOpacity>
				</View>

				{/* Service Hub banner */}
				<TouchableOpacity
					style={[
						styles.serviceHubBanner,
						{
							backgroundColor: hasApprovedService ? colors.greenBg : (colors.amber ?? "#F59E0B") + "14",
							borderColor:     hasApprovedService ? colors.greenBorder : (colors.amber ?? "#F59E0B") + "50",
						},
					]}
					onPress={() => navigation.navigate("SettingsNav", { screen: "ServiceHub" })}
					activeOpacity={0.8}
				>
					<View style={[styles.serviceHubIconWrap, { backgroundColor: hasApprovedService ? colors.greenBg : (colors.amber ?? "#F59E0B") + "20" }]}>
						<Ionicons
							name={hasApprovedService ? "shield-checkmark-outline" : "lock-open-outline"}
							size={20}
							color={hasApprovedService ? (colors.green ?? "#059669") : (colors.amber ?? "#F59E0B")}
						/>
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.serviceHubTitle, { color: colors.text }]}>
							{hasApprovedService ? "Service Hub" : "Unlock Services to Go Online"}
						</Text>
						<Text style={[styles.serviceHubSub, { color: colors.textMuted }]}>
							{hasApprovedService
								? "Manage your approved services and add new ones"
								: "Submit equipment proof to start receiving job requests"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
				</TouchableOpacity>

				{/* Earnings Summary */}
				<View style={styles.earningsGrid}>
					<Card style={styles.earningsCard}>
						<View style={[styles.earningsIcon, { backgroundColor: colors.accentBg }]}>
							<Ionicons name="cash-outline" size={18} color={colors.primary} />
						</View>
						<Text style={[styles.earningsValue, { color: colors.text }]}>
							${earnings.today.toFixed(2)}
						</Text>
						<Text style={[styles.earningsLabel, { color: colors.textMuted }]}>
							Today's Earnings
						</Text>
					</Card>
					<Card style={styles.earningsCard}>
						<View style={[styles.earningsIcon, { backgroundColor: colors.greenBg }]}>
							<Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
						</View>
						<Text style={[styles.earningsValue, { color: colors.text }]}>
							{earnings.completedJobs.length}
						</Text>
						<Text style={[styles.earningsLabel, { color: colors.textMuted }]}>
							Completed Jobs
						</Text>
					</Card>
				</View>

				{/* Section header */}
				<View style={styles.sectionHeaderRow}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Available Requests
					</Text>
					{isOnline && visibleJobs.length > 0 && (
						<View style={[styles.countBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
							<Text style={[styles.countText, { color: colors.accentText }]}>
								{visibleJobs.length}
							</Text>
						</View>
					)}
				</View>

				{!isOnline ? (
					<View style={[styles.emptyState, { borderColor: colors.border }]}>
						<View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
							<Ionicons name="moon-outline" size={32} color={colors.textMuted} />
						</View>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							You're Offline
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							Switch online to see available requests in your area.
						</Text>
					</View>
				) : checkingForJobs ? (
				<>
					{[0, 1].map(i => (
						<View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							<View style={styles.skeletonHeader}>
								<Skeleton style={styles.skeletonBadge} />
								<Skeleton style={styles.skeletonPrice} />
							</View>
							<View style={styles.skeletonRow}>
								<Skeleton style={styles.skeletonDot} />
								<Skeleton style={styles.skeletonLine} />
							</View>
							<Skeleton style={styles.skeletonBtn} />
						</View>
					))}
				</>
			) : visibleJobs.length === 0 ? (
					<View style={[styles.emptyState, { borderColor: colors.border }]}>
						<View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
							<Ionicons name="search-outline" size={32} color={colors.textMuted} />
						</View>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							No Requests Yet
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							No requests in your area right now. Check back soon.
						</Text>
					</View>
				) : (
					visibleJobs.map(job => {
						const eta   = calcEta(driverLat, driverLng, job);
						const v     = job.customerVehicle;
						const vehicleLabel = v
							? [v.year, v.make, v.model, v.color ? '· ' + v.color : ''].filter(Boolean).join(' ')
							: null;
						const isNew = newJobIds.has(String(job.id));
						return (
						<Card
							key={job.id}
							style={[
								styles.jobCard,
								isNew && {
									borderColor:   colors.primary,
									borderWidth:   2,
									shadowColor:   colors.primary,
									shadowOpacity: 0.35,
									shadowRadius:  10,
									shadowOffset:  { width: 0, height: 0 },
									elevation:     8,
								},
							]}
						>
							{/* NEW badge */}
							{isNew && (
								<Animated.View style={[styles.newBadge, { backgroundColor: colors.primary, opacity: badgeAnim }]}>
									<Text style={styles.newBadgeText}>NEW</Text>
								</Animated.View>
							)}
							{/* Job type + price */}
							<View style={styles.jobHeader}>
								<View
									style={[
										styles.serviceBadge,
										{ backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
									]}
								>
									<Ionicons name="car-outline" size={14} color={colors.accentText} />
									<Text style={[styles.serviceText, { color: colors.accentText }]}>
										{job.serviceType
											?.split("-")
											.map(word => word.charAt(0).toUpperCase() + word.slice(1))
											.join(" ")}
									</Text>
								</View>
								<Text style={[styles.jobPrice, { color: colors.text }]}>
									<Text style={{ color: colors.primary, fontSize: 13 }}>$</Text>
									{job.estimatedPrice}
								</Text>
							</View>

							{/* Partial address + ETA */}
							<View style={styles.jobLocationRow}>
								<View style={[styles.locationDot, { backgroundColor: colors.primary + "20" }]}>
									<Ionicons name="location-outline" size={14} color={colors.primary} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.jobAddress, { color: colors.textMuted }]} numberOfLines={1}>
										{maskAddress(job.customerLocation?.address)}
									</Text>
									{eta && (
										<Text style={[styles.etaText, { color: colors.primary }]}>
											{eta} away
										</Text>
									)}
								</View>
							</View>

							{/* Vehicle info */}
							{vehicleLabel && (
								<View style={styles.vehicleRow}>
									<View style={[styles.locationDot, { backgroundColor: colors.surface }]}>
										<Ionicons name="car-sport-outline" size={14} color={colors.textMuted} />
									</View>
									<Text style={[styles.vehicleText, { color: colors.textMuted }]} numberOfLines={1}>
										{vehicleLabel}
									</Text>
								</View>
							)}

							<View style={styles.cardActions}>
								<TouchableOpacity
									onPress={() => handleDecline(String(job.id))}
									style={[styles.declineBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
									activeOpacity={0.7}
								>
									<Text style={[styles.declineBtnText, { color: colors.textMuted }]}>Decline</Text>
								</TouchableOpacity>
								<View style={styles.acceptBtnWrap}>
									<PrimaryButton
										title="Accept"
										onPress={() => acceptJob(job.id!)}
									/>
								</View>
							</View>
						</Card>
						);
					})
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
	},
	title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
	statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
	statusIndicator: { width: 6, height: 6, borderRadius: 3 },
	subtitle: { fontSize: 13 },
	settingsBtn: {
		width: 40,
		height: 40,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	content: { padding: 16 },

	// Status toggle card
	statusCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: 20,
		borderWidth: 1,
		padding: 16,
		marginBottom: 16,
	},
	statusLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
	statusDot: { width: 10, height: 10, borderRadius: 5 },
	statusText: { fontSize: 15, fontWeight: "700" },
	statusHint: { fontSize: 12, marginTop: 2 },
	toggleBtn: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
	},
	toggleText: { fontSize: 13, fontWeight: "700" },

	// Earnings
	earningsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
	earningsCard: { flex: 1, padding: 16, alignItems: "flex-start", marginBottom: 0 },
	earningsIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	earningsValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
	earningsLabel: { fontSize: 12, marginTop: 2, fontWeight: "500" },

	// Section header
	sectionHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 12,
	},
	sectionTitle: { fontSize: 17, fontWeight: "700" },
	countBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
	},
	countText: { fontSize: 12, fontWeight: "700" },

	// Empty state
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		padding: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderStyle: "dashed",
	},
	emptyIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
	emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

	// Job card
	jobCard: { marginBottom: 12, padding: 16 },
	newBadge: {
		position:          "absolute",
		top:               12,
		right:             12,
		paddingHorizontal: 8,
		paddingVertical:   3,
		borderRadius:      8,
		zIndex:            10,
	},
	newBadgeText: {
		color:         "#fff",
		fontSize:      10,
		fontWeight:    "800",
		letterSpacing: 1,
	},
	jobHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 14,
	},
	serviceBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 10,
		borderWidth: 1,
	},
	serviceText: { fontSize: 12, fontWeight: "700" },
	jobPrice: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
	jobLocationRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginBottom: 10,
	},
	locationDot: {
		width: 28,
		height: 28,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	jobAddress: { fontSize: 13, lineHeight: 18, paddingTop: 4 },
	etaText: { fontSize: 12, fontWeight: "600", marginTop: 2 },
	vehicleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 14,
	},
	vehicleText: { flex: 1, fontSize: 13, lineHeight: 18 },
	acceptBtn: { marginTop: 0 },

	// Decline / Accept action row
	cardActions:    { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
	declineBtn:     { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
	declineBtnText: { fontSize: 14, fontWeight: "600" },
	acceptBtnWrap:  { flex: 1 },

	// Service Hub banner
	serviceHubBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderRadius: 16,
		borderWidth: 1,
		padding: 14,
		marginBottom: 16,
	},
	serviceHubIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	serviceHubTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
	serviceHubSub:   { fontSize: 12, lineHeight: 17 },

	// Skeleton cards
	skeletonCard: {
		borderRadius: 20,
		borderWidth: 1,
		padding: 16,
		marginBottom: 12,
	},
	skeletonHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
	skeletonBadge:  { height: 28, width: 110, borderRadius: 10 },
	skeletonPrice:  { height: 28, width: 60, borderRadius: 8 },
	skeletonRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
	skeletonDot:    { width: 28, height: 28, borderRadius: 8, flexShrink: 0 },
	skeletonLine:   { flex: 1, height: 16, borderRadius: 6 },
	skeletonBtn:    { height: 46, borderRadius: 12 },
});
