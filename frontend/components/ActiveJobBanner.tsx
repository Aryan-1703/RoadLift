import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
	Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainerRef } from "@react-navigation/native";
import { useJob } from "../context/JobContext";
import { useDriver } from "../context/DriverContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Active job statuses that should trigger the banner
const ACTIVE_CUSTOMER_STATUSES = new Set([
	"searching",
	"tracking",
	"arrived",
	"in_progress",
]);

const SERVICE_LABELS: Record<string, string> = {
	"towing":          "Towing",
	"tire-change":     "Tire Change",
	"car-lockout":     "Car Lockout",
	"fuel-delivery":   "Fuel Delivery",
	"battery-boost":   "Battery Boost",
	"accident":        "Accident",
};

const STATUS_LABELS: Record<string, string> = {
	searching:   "Finding a driver…",
	tracking:    "Driver en route",
	arrived:     "Driver arrived",
	in_progress: "Service in progress",
	// driver statuses
	accepted:    "En route to customer",
	in_progress_driver: "Service in progress",
};

interface Props {
	navigationRef: React.RefObject<NavigationContainerRef<any>>;
	/** Current top-level route name so we can hide the banner on job/driver screens */
	currentRoute: string | null;
}

export const ActiveJobBanner: React.FC<Props> = ({ navigationRef, currentRoute }) => {
	const { user } = useAuth();
	const { job } = useJob();
	const { activeJob } = useDriver();
	const { colors, isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(120)).current;

	const isCustomer = user?.role === "CUSTOMER";
	const isDriver   = user?.role === "DRIVER";

	// Whether there's something to show
	const hasActiveCustomerJob = isCustomer && ACTIVE_CUSTOMER_STATUSES.has(job.status);
	const hasActiveDriverJob   = isDriver   && activeJob !== null;
	const shouldShow           = hasActiveCustomerJob || hasActiveDriverJob;

	// Hide banner when the user is already on the primary job screen
	const onJobScreen = currentRoute === "JobFlow" || currentRoute === "DriverFlow";
	const visible     = shouldShow && !onJobScreen;

	// Slide in / out
	useEffect(() => {
		Animated.spring(slideAnim, {
			toValue:       visible ? 0 : 120,
			useNativeDriver: true,
			damping:       18,
			stiffness:     160,
		}).start();
	}, [visible]);

	const handleResume = () => {
		if (!navigationRef.current) return;
		if (isCustomer) {
			navigationRef.current.navigate("JobFlow" as never);
		} else {
			navigationRef.current.navigate("DriverFlow" as never);
		}
	};

	// Derive display values
	const serviceLabel = isCustomer
		? SERVICE_LABELS[job.serviceType ?? ""] ?? "Service"
		: SERVICE_LABELS[activeJob?.serviceType ?? ""] ?? "Service";

	const statusLabel = isCustomer
		? (STATUS_LABELS[job.status] ?? "Active Job")
		: (STATUS_LABELS[activeJob?.status ?? ""] ?? "Active Job");

	const iconName: any = isCustomer ? "car" : "navigate";
	const accentColor  = isDarkMode ? "#4F8EF7" : colors.primary;
	const bgColor      = isDarkMode ? "#0d1424" : "#FFFFFF";
	const borderColor  = isDarkMode ? "rgba(79,142,247,0.3)" : "rgba(26,107,255,0.2)";

	return (
		<Animated.View
			style={[
				styles.wrapper,
				{
					transform:    [{ translateY: slideAnim }],
					paddingBottom: Math.max(insets.bottom, 12),
				},
			]}
			pointerEvents={visible ? "box-none" : "none"}
		>
			<TouchableOpacity
				style={[
					styles.pill,
					{
						backgroundColor: bgColor,
						borderColor,
						shadowColor: accentColor,
					},
				]}
				onPress={handleResume}
				activeOpacity={0.85}
			>
				{/* Pulsing dot */}
				<View style={[styles.dot, { backgroundColor: accentColor }]} />

				{/* Icon */}
				<View style={[styles.iconWrap, { backgroundColor: accentColor + "20" }]}>
					<Ionicons name={iconName} size={18} color={accentColor} />
				</View>

				{/* Text */}
				<View style={styles.textWrap}>
					<Text style={[styles.serviceText, { color: colors.text }]} numberOfLines={1}>
						{serviceLabel}
					</Text>
					<Text style={[styles.statusText, { color: accentColor }]} numberOfLines={1}>
						{statusLabel}
					</Text>
				</View>

				{/* Resume arrow */}
				<View style={[styles.resumeBtn, { backgroundColor: accentColor }]}>
					<Text style={styles.resumeLabel}>Resume</Text>
					<Ionicons name="chevron-forward" size={13} color="#fff" />
				</View>
			</TouchableOpacity>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	wrapper: {
		position:        "absolute",
		bottom:          0,
		left:            0,
		right:           0,
		alignItems:      "center",
		paddingHorizontal: 16,
		paddingTop:      8,
		zIndex:          9999,
		pointerEvents:   "box-none",
	},
	pill: {
		flexDirection:   "row",
		alignItems:      "center",
		borderRadius:    20,
		borderWidth:     1.5,
		paddingVertical:   12,
		paddingHorizontal: 14,
		width:           "100%",
		gap:             10,
		// Shadow
		shadowOffset:    { width: 0, height: 8 },
		shadowOpacity:   0.18,
		shadowRadius:    20,
		elevation:       12,
	},
	dot: {
		position:   "absolute",
		top:        10,
		left:       10,
		width:      8,
		height:     8,
		borderRadius: 4,
	},
	iconWrap: {
		width:         38,
		height:        38,
		borderRadius:  12,
		alignItems:    "center",
		justifyContent: "center",
	},
	textWrap: {
		flex: 1,
	},
	serviceText: {
		fontSize:    15,
		fontWeight:  "700",
		marginBottom: 2,
	},
	statusText: {
		fontSize:   12,
		fontWeight: "600",
	},
	resumeBtn: {
		flexDirection:   "row",
		alignItems:      "center",
		paddingHorizontal: 10,
		paddingVertical:   7,
		borderRadius:    12,
		gap:             2,
	},
	resumeLabel: {
		color:      "#fff",
		fontSize:   12,
		fontWeight: "700",
	},
});
