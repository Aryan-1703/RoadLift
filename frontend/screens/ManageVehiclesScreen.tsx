import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Modal,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

interface VehicleItem {
	id: string | number;
	make: string;
	model: string;
	year: number | string;
	color: string;
	licensePlate: string;
	isDefault?: boolean;
}

export const ManageVehiclesScreen = () => {
	const { colors } = useTheme();
	const { showToast } = useToast();
	const { user, setUser } = useAuth();
	const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
	const [loading, setLoading] = useState(true);

	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [newVehicle, setNewVehicle] = useState({
		year: "",
		make: "",
		model: "",
		color: "",
		licensePlate: "",
	});

	useEffect(() => {
		loadVehicles();
	}, [user?.defaultVehicleId]);

	const loadVehicles = async () => {
		try {
			const res = await api.get("/vehicles");
			const mappedVehicles = res.data.map((v: any) => ({
				...v,
				isDefault: String(v.id) === String(user?.defaultVehicleId),
			}));
			setVehicles(mappedVehicles);
		} catch (e) {
			console.warn("Failed to load vehicles", e);
			showToast("Failed to load vehicles", "error");
		} finally {
			setLoading(false);
		}
	};

	const confirmDelete = (id: string | number, name: string) => {
		Alert.alert(
			"Remove Vehicle",
			`Remove ${name} from your vehicles?`,
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Remove", style: "destructive", onPress: () => deleteVehicle(id) },
			],
		);
	};

	const deleteVehicle = async (id: string | number) => {
		try {
			await api.delete(`/vehicles/${id}`);
			const remaining = vehicles.filter(v => String(v.id) !== String(id));
			setVehicles(remaining);

			// If we deleted the default, clear it (and auto-set next available)
			if (String(user?.defaultVehicleId) === String(id)) {
				const nextDefault = remaining[0] ?? null;
				if (nextDefault) {
					await api.put("/vehicles/set-default", { vehicleId: nextDefault.id });
					const updated = { ...user!, defaultVehicleId: nextDefault.id };
					setUser(updated);
					await AsyncStorage.setItem("@roadlift_user", JSON.stringify(updated));
					setVehicles(remaining.map(v => ({ ...v, isDefault: String(v.id) === String(nextDefault.id) })));
				} else {
					const updated = { ...user!, defaultVehicleId: null };
					setUser(updated as any);
					await AsyncStorage.setItem("@roadlift_user", JSON.stringify(updated));
				}
			}

			showToast("Vehicle deleted", "success");
		} catch (e) {
			console.warn("Failed to delete vehicle", e);
			showToast("Failed to delete vehicle", "error");
		}
	};

	const setDefaultVehicle = async (id: string | number) => {
		try {
			await api.put("/vehicles/set-default", { vehicleId: id });
			const updated = { ...user!, defaultVehicleId: id };
			setUser(updated);
			await AsyncStorage.setItem("@roadlift_user", JSON.stringify(updated));
			setVehicles(prev => prev.map(v => ({ ...v, isDefault: String(v.id) === String(id) })));
			showToast("Default vehicle updated", "success");
		} catch (e) {
			console.warn("Failed to set default vehicle", e);
			showToast("Failed to set default vehicle", "error");
		}
	};

	const handleAddVehicle = async () => {
		if (
			!newVehicle.year ||
			!newVehicle.make ||
			!newVehicle.model ||
			!newVehicle.licensePlate
		) {
			showToast("Please fill in all required fields", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await api.post("/vehicles", newVehicle);
			const isFirstVehicle = vehicles.length === 0;

			// Auto-set as default if it's the first vehicle
			if (isFirstVehicle) {
				await api.put("/vehicles/set-default", { vehicleId: res.data.id });
				const updated = { ...user!, defaultVehicleId: res.data.id };
				setUser(updated);
				await AsyncStorage.setItem("@roadlift_user", JSON.stringify(updated));
			}

			const addedVehicle = {
				...res.data,
				isDefault: isFirstVehicle || String(res.data.id) === String(user?.defaultVehicleId),
			};
			setVehicles(prev => [...prev, addedVehicle]);
			setIsModalVisible(false);
			setNewVehicle({ year: "", make: "", model: "", color: "", licensePlate: "" });
			showToast("Vehicle added successfully", "success");
		} catch (e) {
			console.warn("Failed to add vehicle", e);
			showToast("Failed to add vehicle", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderItem = ({ item }: { item: VehicleItem }) => (
		<Card style={styles.card}>
			<View style={styles.cardHeader}>
				<View style={styles.titleRow}>
					<Text style={[styles.vehicleTitle, { color: colors.text }]}>
						{item.year} {item.make} {item.model}
					</Text>
					{item.isDefault && (
						<View style={[styles.badge, { backgroundColor: colors.accentBg }]}>
							<Text style={[styles.badgeText, { color: colors.accentText }]}>Default</Text>
						</View>
					)}
				</View>
				<TouchableOpacity onPress={() => confirmDelete(item.id, item.year + " " + item.make + " " + item.model)}>
					<Ionicons name="trash-outline" size={20} color={colors.danger} />
				</TouchableOpacity>
			</View>
			<Text style={[styles.vehicleDetails, { color: colors.textMuted }]}>
				Color: {item.color || "N/A"} • License: {item.licensePlate}
			</Text>
			{!item.isDefault && (
				<TouchableOpacity
					style={styles.setDefaultBtn}
					onPress={() => setDefaultVehicle(item.id)}
				>
					<Text style={[styles.setDefaultText, { color: colors.primary }]}>
						Set as Default
					</Text>
				</TouchableOpacity>
			)}
		</Card>
	);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{loading ? (
				<ActivityIndicator color={colors.primary} style={styles.loader} />
			) : (
				<FlatList
					data={vehicles}
					keyExtractor={item => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							No vehicles added yet.
						</Text>
					}
				/>
			)}
			<View
				style={[
					styles.footer,
					{ borderTopColor: colors.border, backgroundColor: colors.background },
				]}
			>
				<PrimaryButton title="Add New Vehicle" onPress={() => setIsModalVisible(true)} />
			</View>

			<Modal visible={isModalVisible} animationType="slide" transparent={true}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.modalOverlay}
				>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								Add New Vehicle
							</Text>
							<TouchableOpacity onPress={() => setIsModalVisible(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalScroll}>
							<View style={styles.inputGroup}>
								<Text style={[styles.label, { color: colors.text }]}>Year *</Text>
								<TextInput
									style={[
										styles.input,
										{ borderColor: colors.border, color: colors.text },
									]}
									value={newVehicle.year}
									onChangeText={val => setNewVehicle(prev => ({ ...prev, year: val }))}
									keyboardType="numeric"
									placeholder="e.g. 2022"
									placeholderTextColor={colors.textMuted}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={[styles.label, { color: colors.text }]}>Make *</Text>
								<TextInput
									style={[
										styles.input,
										{ borderColor: colors.border, color: colors.text },
									]}
									value={newVehicle.make}
									onChangeText={val => setNewVehicle(prev => ({ ...prev, make: val }))}
									placeholder="e.g. Toyota"
									placeholderTextColor={colors.textMuted}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={[styles.label, { color: colors.text }]}>Model *</Text>
								<TextInput
									style={[
										styles.input,
										{ borderColor: colors.border, color: colors.text },
									]}
									value={newVehicle.model}
									onChangeText={val => setNewVehicle(prev => ({ ...prev, model: val }))}
									placeholder="e.g. Camry"
									placeholderTextColor={colors.textMuted}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={[styles.label, { color: colors.text }]}>Color</Text>
								<TextInput
									style={[
										styles.input,
										{ borderColor: colors.border, color: colors.text },
									]}
									value={newVehicle.color}
									onChangeText={val => setNewVehicle(prev => ({ ...prev, color: val }))}
									placeholder="e.g. Silver"
									placeholderTextColor={colors.textMuted}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={[styles.label, { color: colors.text }]}>
									License Plate *
								</Text>
								<TextInput
									style={[
										styles.input,
										{ borderColor: colors.border, color: colors.text },
									]}
									value={newVehicle.licensePlate}
									onChangeText={val =>
										setNewVehicle(prev => ({ ...prev, licensePlate: val }))
									}
									placeholder="e.g. ABC-1234"
									autoCapitalize="characters"
									placeholderTextColor={colors.textMuted}
								/>
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<PrimaryButton
								title="Save Vehicle"
								onPress={handleAddVehicle}
								isLoading={isSubmitting}
								disabled={
									isSubmitting ||
									!newVehicle.year ||
									!newVehicle.make ||
									!newVehicle.model ||
									!newVehicle.licensePlate
								}
							/>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	loader: { marginTop: 40 },
	listContent: { padding: 16, paddingBottom: 100 },
	card: { marginBottom: 12 },
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	titleRow: { flexDirection: "row", alignItems: "center" },
	vehicleTitle: { fontSize: 16, fontWeight: "bold" },
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginLeft: 8,
	},
	badgeText: { fontSize: 10, fontWeight: "bold" },
	vehicleDetails: { fontSize: 14, marginBottom: 8 },
	setDefaultBtn: { marginTop: 8, alignSelf: "flex-start" },
	setDefaultText: { fontSize: 14, fontWeight: "600" },
	emptyText: { textAlign: "center", marginTop: 40, fontSize: 16 },
	footer: {
		padding: 16,
		borderTopWidth: 1,
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		maxHeight: "80%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	modalTitle: { fontSize: 20, fontWeight: "bold" },
	modalScroll: { marginBottom: 20 },
	inputGroup: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
	input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
	modalFooter: { paddingBottom: 20 },
});
