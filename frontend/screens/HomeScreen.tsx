import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useJob } from "../context/JobContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MockMap } from "../components/MockMap";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

export const HomeScreen = () => {
	const { setCustomerLocation, setJobStatus, job } = useJob();
	const { user } = useAuth();
	const { colors } = useTheme();
	const navigation = useNavigation<any>();

	useEffect(() => {
		setCustomerLocation({
			latitude: 43.6532,
			longitude: -79.3832,
			address: "123 Yonge St, Toronto, ON",
		});
		// Intentionally empty dependency array to ensure this only fires once when the screen mounts
	}, []);

	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.headerSafeArea}>
				<View style={styles.topBar}>
					<View style={[styles.statusBadge, { backgroundColor: colors.card }]}>
						<View style={styles.statusDot} />
						<Text style={[styles.statusText, { color: colors.text }]}>GTA Online</Text>
					</View>

					<TouchableOpacity
						style={[styles.profileBtn, { backgroundColor: colors.card }]}
						onPress={() => navigation.navigate("SettingsNav")}
					>
						<Text style={[styles.profileInitial, { color: colors.text }]}>
							{user?.name?.charAt(0) || "?"}
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>

			<MockMap userLocation={job.customerLocation} style={styles.map} />

			<View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
				<View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

				<Text style={[styles.title, { color: colors.text }]}>Need a lift?</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Request fast, reliable roadside assistance.
				</Text>

				<View
					style={[
						styles.locationCard,
						{ backgroundColor: colors.background, borderColor: colors.border },
					]}
				>
					<View style={[styles.locationIcon, { backgroundColor: colors.primary + "20" }]}>
						<Ionicons name="location" size={20} color={colors.primary} />
					</View>
					<View>
						<Text style={[styles.locationLabel, { color: colors.textMuted }]}>
							Current Location
						</Text>
						<Text style={[styles.locationText, { color: colors.text }]}>
							{job.customerLocation?.address || "Locating..."}
						</Text>
					</View>
				</View>

				<PrimaryButton
					title="Request Assistance"
					onPress={() => setJobStatus("selecting")}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1 },
	headerSafeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
	topBar: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		elevation: 2,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#10B981",
		marginRight: 8,
	},
	statusText: { fontSize: 14, fontWeight: "bold" },
	profileBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		elevation: 2,
	},
	profileInitial: { fontSize: 16, fontWeight: "bold" },
	bottomSheet: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	dragHandle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		alignSelf: "center",
		marginBottom: 20,
	},
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
	subtitle: { fontSize: 14, marginBottom: 20 },
	locationCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 24,
	},
	locationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	locationLabel: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
	locationText: { fontSize: 14, fontWeight: "bold" },
});
