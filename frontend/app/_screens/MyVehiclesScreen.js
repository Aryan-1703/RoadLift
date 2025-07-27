import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import { useAuth } from "../_context/AuthContext";
import axios from "axios";
import { API_URL } from "../config/constants";
import { FontAwesome5 } from "@expo/vector-icons";
import SwipeableRow from "../_components/SwipeableRow";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// A component for a single vehicle row
const VehicleRow = ({ vehicle, isDefault, onSetDefault }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];
	return (
		<TouchableOpacity
			style={[
				styles.cardRow,
				{ backgroundColor: colors.card, borderColor: colors.border },
			]}
			onPress={onSetDefault}
			disabled={isDefault}
		>
			<FontAwesome5 name="car" size={24} color={colors.text} style={styles.cardIcon} />
			<View style={styles.cardTextContainer}>
				<Text style={[styles.cardTitle, { color: colors.text }]}>
					{vehicle.year} {vehicle.make} {vehicle.model}
				</Text>
				<Text style={[styles.cardSubtitle, { color: colors.tabIconDefault }]}>
					{vehicle.licensePlate || "No plate added"}
				</Text>
			</View>
			{isDefault && (
				<View style={[styles.defaultBadge, { backgroundColor: colors.tint }]}>
					<Text style={styles.defaultBadgeText}>Default</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

const MyVehiclesScreen = () => {
	const router = useRouter();
	const { token, user, login } = useAuth();
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	const [vehicles, setVehicles] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchVehicles = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const response = await axios.get(`${API_URL}/vehicles`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setVehicles(response.data);
		} catch (error) {
			Alert.alert("Error", "Could not load your vehicles.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		React.useCallback(() => {
			fetchVehicles();
		}, [token])
	);

	// --- HANDLERS ---
	const handleSetDefault = async vehicleId => {
		try {
			await axios.put(
				`${API_URL}/vehicles/set-default`,
				{ vehicleId },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const updatedUser = { ...user, defaultVehicleId: vehicleId };
			await login({ token, user: updatedUser, role: "user" }, false);
			// No need to call fetchVehicles() again, the user object update will trigger a re-render.
		} catch (error) {
			Alert.alert("Error", "Could not set default vehicle.");
		}
	};

	const handleDelete = vehicleId => {
		Alert.alert("Delete Vehicle", "Are you sure you want to remove this vehicle?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await axios.delete(`${API_URL}/vehicles/${vehicleId}`, {
							headers: { Authorization: `Bearer ${token}` },
						});
						// Refresh the list after deleting
						fetchVehicles();
					} catch (error) {
						Alert.alert("Error", "Could not delete vehicle.");
					}
				},
			},
		]);
	};

	const renderVehicle = ({ item }) => (
		<SwipeableRow onDelete={() => handleDelete(item.id)}>
			<VehicleRow
				vehicle={item}
				isDefault={item.id === user?.defaultVehicleId}
				onSetDefault={() => handleSetDefault(item.id)}
			/>
		</SwipeableRow>
	);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
				<ModalHeader title="My Vehicles" />

				{isLoading ? (
					<View style={styles.center}>
						<ActivityIndicator />
					</View>
				) : (
					<FlatList
						data={vehicles}
						renderItem={renderVehicle}
						keyExtractor={item => item.id.toString()}
						ListHeaderComponent={
							<View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
								<Text
									style={[
										styles.infoText,
										{
											color: colors.tabIconDefault,
											textAlign: "center",
											marginBottom: 8,
										},
									]}
								>
									Tap a vehicle to set it as your default.
								</Text>

								<Text style={[styles.headerText, { color: colors.text }]}>
									Your Saved Vehicles
								</Text>
							</View>
						}
						ListEmptyComponent={
							<View style={styles.center}>
								<Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
									No vehicles added yet.
								</Text>
							</View>
						}
						contentContainerStyle={{ flexGrow: 1 }}
					/>
				)}

				<TouchableOpacity
					style={[styles.addButton, { backgroundColor: colors.tint }]}
					onPress={() => router.push("/add-vehicle")}
				>
					<FontAwesome5 name="plus" size={16} color="#fff" />
					<Text style={styles.addButtonText}>Add New Vehicle</Text>
				</TouchableOpacity>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	headerText: { fontSize: 24, fontWeight: "bold", padding: 20, paddingBottom: 10 },
	emptyText: { textAlign: "center", fontSize: 16 },
	cardRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	cardIcon: { width: 40, marginRight: 15, textAlign: "center" },
	cardTextContainer: { flex: 1 },
	cardTitle: { fontSize: 16, fontWeight: "bold" },
	cardSubtitle: { fontSize: 14, marginTop: 4 },
	defaultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
	defaultBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
	addButton: {
		flexDirection: "row",
		margin: 20,
		padding: 15,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
});

export default MyVehiclesScreen;
