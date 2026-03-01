import React, { useState, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	Animated,
} from "react-native";
import { useJob } from "../context/JobContext";
import { useTheme } from "../context/ThemeContext";
import { SERVICES } from "../constants";
import { ServiceTypeId } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/PrimaryButton";

// ── Icon + color config per service ──────────────────────────────────────────
const SERVICE_META: Record<
	string,
	{
		icon: React.ComponentProps<typeof Ionicons>["name"];
		dark: { iconColor: string; iconBg: string; accent: string };
		light: { iconColor: string; iconBg: string; accent: string };
	}
> = {
	towing: {
		icon: "car",
		dark: { iconColor: "#60a5fa", iconBg: "#1e3a5f", accent: "#1a6bff" },
		light: { iconColor: "#1A6BFF", iconBg: "#DBEAFE", accent: "#1A6BFF" },
	},
	"tire-change": {
		icon: "disc-outline",
		dark: { iconColor: "#f59e0b", iconBg: "#451a03", accent: "#f59e0b" },
		light: { iconColor: "#B87000", iconBg: "#FEF3C7", accent: "#B87000" },
	},
	"car-lockout": {
		icon: "key-outline",
		dark: { iconColor: "#a78bfa", iconBg: "#2e1065", accent: "#a78bfa" },
		light: { iconColor: "#7C3AED", iconBg: "#EDE9FE", accent: "#7C3AED" },
	},
	"fuel-delivery": {
		icon: "water-outline",
		dark: { iconColor: "#34d399", iconBg: "#064e3b", accent: "#34d399" },
		light: { iconColor: "#0B7B56", iconBg: "#D1FAE5", accent: "#0B7B56" },
	},
	"battery-boost": {
		icon: "flash-outline",
		dark: { iconColor: "#fb7185", iconBg: "#4c0519", accent: "#fb7185" },
		light: { iconColor: "#D93025", iconBg: "#FFE4E6", accent: "#D93025" },
	},
};

// Estimated time copy per service
const ETA_COPY: Record<string, string> = {
	towing: "20–35 min",
	"tire-change": "15–25 min",
	"car-lockout": "10–20 min",
	"fuel-delivery": "15–25 min",
	"battery-boost": "10–20 min",
};

export const ServiceSelectionScreen = () => {
	const { setJobStatus, selectService } = useJob();
	const { colors, isDarkMode } = useTheme();
	const [selectedId, setSelectedId] = useState<ServiceTypeId | null>(null);

	// Button press scale
	const scaleAnims = useRef<Record<string, Animated.Value>>(
		Object.fromEntries(SERVICES.map(s => [s.id, new Animated.Value(1)])),
	).current;

	const handlePressIn = (id: string) =>
		Animated.spring(scaleAnims[id], {
			toValue: 0.97,
			useNativeDriver: true,
			tension: 80,
			friction: 8,
		}).start();
	const handlePressOut = (id: string) =>
		Animated.spring(scaleAnims[id], {
			toValue: 1,
			useNativeDriver: true,
			tension: 60,
			friction: 8,
		}).start();

	const handleSelect = (id: ServiceTypeId) => {
		setSelectedId(id);
	};

	const handleConfirm = () => {
		if (!selectedId) return;
		const service = SERVICES.find(s => s.id === selectedId)!;
		selectService(selectedId, service.basePrice);
	};

	const selected = SERVICES.find(s => s.id === selectedId);

	// Derived colors
	const headerBg = isDarkMode ? colors.card : "#FFFFFF";
	const dividerColor = isDarkMode ? "rgba(255,255,255,0.07)" : "#E2DDD6";
	const pageBg = colors.background;
	const sectionLabelColor = colors.sectionLabel;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: pageBg }]}>
			{/* ── Header ── */}
			<View
				style={[
					styles.header,
					{ backgroundColor: headerBg, borderBottomColor: dividerColor },
				]}
			>
				<TouchableOpacity
					style={styles.backBtn}
					onPress={() => setJobStatus("idle")}
					activeOpacity={0.7}
				>
					<View
						style={[
							styles.backIconWrap,
							{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#EDE9E2" },
						]}
					>
						<Ionicons name="chevron-back" size={18} color={colors.text} />
					</View>
				</TouchableOpacity>
				<View style={styles.headerText}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Select Service</Text>
					<Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
						What do you need help with?
					</Text>
				</View>
			</View>

			{/* ── Service list ── */}
			<ScrollView
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
			>
				<Text style={[styles.sectionLabel, { color: sectionLabelColor }]}>
					AVAILABLE SERVICES
				</Text>

				{SERVICES.map((service, index) => {
					const meta = SERVICE_META[service.id] ?? SERVICE_META["towing"];
					const theme = isDarkMode ? meta.dark : meta.light;
					const isSelected = selectedId === service.id;
					const eta = ETA_COPY[service.id] ?? "15–30 min";

					return (
						<Animated.View
							key={service.id}
							style={{ transform: [{ scale: scaleAnims[service.id] }] }}
						>
							<TouchableOpacity
								style={[
									styles.serviceCard,
									{
										backgroundColor: isSelected
											? isDarkMode
												? "rgba(26,107,255,0.08)"
												: "rgba(26,107,255,0.04)"
											: colors.card,
										borderColor: isSelected
											? colors.primary
											: isDarkMode
												? "rgba(255,255,255,0.07)"
												: "#E2DDD6",
										shadowColor: isDarkMode ? "#000" : "#5C4A3A",
										shadowOpacity: isSelected
											? isDarkMode
												? 0.3
												: 0.12
											: isDarkMode
												? 0.2
												: 0.06,
									},
								]}
								onPress={() => handleSelect(service.id)}
								onPressIn={() => handlePressIn(service.id)}
								onPressOut={() => handlePressOut(service.id)}
								activeOpacity={1}
							>
								{/* Left: icon */}
								<View style={[styles.iconCol]}>
									<View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
										<Ionicons name={meta.icon} size={24} color={theme.iconColor} />
									</View>
								</View>

								{/* Middle: info */}
								<View style={styles.infoCol}>
									<Text style={[styles.serviceName, { color: colors.text }]}>
										{service.title}
									</Text>
									<Text style={[styles.serviceDesc, { color: colors.textMuted }]}>
										{service.description}
									</Text>
									<View style={styles.metaRow}>
										<View
											style={[
												styles.etaChip,
												{
													backgroundColor: isDarkMode
														? "rgba(255,255,255,0.05)"
														: "#EDE9E2",
												},
											]}
										>
											<Ionicons name="time-outline" size={11} color={colors.textMuted} />
											<Text style={[styles.etaText, { color: colors.textMuted }]}>
												{eta}
											</Text>
										</View>
									</View>
								</View>

								{/* Right: price + selector */}
								<View style={styles.priceCol}>
									<Text style={[styles.priceLabel, { color: colors.textMuted }]}>
										from
									</Text>
									<Text style={[styles.priceValue, { color: colors.text }]}>
										${service.basePrice}
									</Text>
									<View
										style={[
											styles.selector,
											{
												borderColor: isSelected
													? colors.primary
													: isDarkMode
														? "rgba(255,255,255,0.15)"
														: "#D4CFC8",
												backgroundColor: isSelected ? colors.primary : "transparent",
											},
										]}
									>
										{isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
									</View>
								</View>
							</TouchableOpacity>
						</Animated.View>
					);
				})}

				{/* Bottom spacer so last card clears the footer */}
				<View style={{ height: 120 }} />
			</ScrollView>

			{/* ── Sticky footer CTA ── */}
			<View
				style={[
					styles.footer,
					{
						backgroundColor: colors.card,
						borderTopColor: dividerColor,
						shadowColor: isDarkMode ? "#000" : "#5C4A3A",
						shadowOpacity: isDarkMode ? 0.25 : 0.08,
					},
				]}
			>
				{selectedId ? (
					<View style={styles.footerInner}>
						{/* Selected service summary */}
						<View style={styles.footerSummary}>
							<View
								style={[
									styles.footerIconWrap,
									{
										backgroundColor:
											(isDarkMode
												? SERVICE_META[selectedId]?.dark
												: SERVICE_META[selectedId]?.light
											)?.iconBg ?? colors.accentBg,
									},
								]}
							>
								<Ionicons
									name={SERVICE_META[selectedId]?.icon ?? "build-outline"}
									size={16}
									color={
										(isDarkMode
											? SERVICE_META[selectedId]?.dark
											: SERVICE_META[selectedId]?.light
										)?.iconColor ?? colors.primary
									}
								/>
							</View>
							<View>
								<Text style={[styles.footerServiceName, { color: colors.text }]}>
									{selected?.title}
								</Text>
								<Text style={[styles.footerServicePrice, { color: colors.textMuted }]}>
									Starting at ${selected?.basePrice}
								</Text>
							</View>
						</View>
						<PrimaryButton
							title="Confirm"
							onPress={handleConfirm}
							style={styles.confirmBtn}
						/>
					</View>
				) : (
					<View style={styles.footerInner}>
						<View
							style={[
								styles.footerPlaceholder,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.04)"
										: "rgba(27,25,22,0.04)",
									borderColor: dividerColor,
								},
							]}
						>
							<Ionicons name="hand-left-outline" size={16} color={colors.textMuted} />
							<Text style={[styles.footerHint, { color: colors.textMuted }]}>
								Select a service above to continue
							</Text>
						</View>
					</View>
				)}
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },

	// Header
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	backBtn: { marginRight: 14 },
	backIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	headerText: { flex: 1 },
	headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
	headerSubtitle: { fontSize: 13, marginTop: 2 },

	// List
	list: { paddingHorizontal: 16, paddingTop: 20 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.9,
		marginBottom: 12,
		marginLeft: 2,
		textTransform: "uppercase",
	},

	// Service card
	serviceCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 20,
		borderWidth: 1.5,
		padding: 16,
		marginBottom: 10,
		shadowOffset: { width: 0, height: 3 },
		shadowRadius: 10,
		elevation: 3,
	},
	iconCol: { marginRight: 14 },
	iconBox: {
		width: 52,
		height: 52,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	infoCol: { flex: 1 },
	serviceName: { fontSize: 16, fontWeight: "700", marginBottom: 3, letterSpacing: -0.2 },
	serviceDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
	metaRow: { flexDirection: "row", gap: 6 },
	etaChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	etaText: { fontSize: 11, fontWeight: "500" },

	// Price column
	priceCol: { alignItems: "flex-end", marginLeft: 10 },
	priceLabel: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
	priceValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginBottom: 10 },
	selector: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},

	// Footer
	footer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingVertical: 14,
		paddingBottom: 24,
		borderTopWidth: 1,
		shadowOffset: { width: 0, height: -4 },
		shadowRadius: 12,
		elevation: 10,
	},
	footerInner: {},
	footerSummary: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 12,
	},
	footerIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	footerServiceName: { fontSize: 15, fontWeight: "700" },
	footerServicePrice: { fontSize: 12, marginTop: 1 },
	confirmBtn: {},
	footerPlaceholder: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 14,
		borderWidth: 1,
		borderStyle: "dashed",
	},
	footerHint: { fontSize: 13 },
});
