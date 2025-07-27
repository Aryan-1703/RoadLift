import React, { useState } from "react";
import {
	View,
	Text,
	SafeAreaView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Alert,
	StatusBar,
	KeyboardAvoidingView,
	ScrollView,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../_context/ThemeContext";
import Colors from "../_constants/Colors";
import ModalHeader from "../_components/ModalHeader";
import { useAuth } from "../_context/AuthContext";
import axios from "axios";
import { API_URL } from "../config/constants";

const AddVehicleScreen = () => {
	// --- HOOKS & STATE ---
	const router = useRouter();
	const { token } = useAuth();
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];

	const [make, setMake] = useState("");
	const [model, setModel] = useState("");
	const [year, setYear] = useState("");
	const [color, setColor] = useState("");
	const [licensePlate, setLicensePlate] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// --- HANDLERS ---
	const handleSaveVehicle = async () => {
		if (!make || !model || !year) {
			Alert.alert(
				"Missing Fields",
				"Please enter the make, model, and year of your vehicle."
			);
			return;
		}
		setIsLoading(true);
		try {
			await axios.post(
				`${API_URL}/vehicles`,
				{ make, model, year, color, licensePlate },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			Alert.alert("Success", "Your vehicle has been added.");
			router.back(); // Go back to the My Vehicles screen
		} catch (error) {
			console.error("Failed to add vehicle:", error.response?.data);
			Alert.alert("Error", "Could not add your vehicle. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// --- RENDER ---
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
			<ModalHeader title="Add a Vehicle" />
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={[styles.label, { color: colors.text }]}>
						Make (e.g., Honda, Ford)
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						value={make}
						onChangeText={setMake}
						placeholder="Toyota"
						placeholderTextColor={colors.tabIconDefault}
					/>
					<Text style={[styles.label, { color: colors.text }]}>
						Model (e.g., Civic, F-150)
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						value={model}
						onChangeText={setModel}
						placeholder="Corolla"
						placeholderTextColor={colors.tabIconDefault}
					/>
					<Text style={[styles.label, { color: colors.text }]}>Year</Text>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						value={year}
						onChangeText={setYear}
						placeholder="2022"
						placeholderTextColor={colors.tabIconDefault}
						keyboardType="number-pad"
					/>
					<Text style={[styles.label, { color: colors.text }]}>Color (Optional)</Text>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						value={color}
						onChangeText={setColor}
						placeholder="Blue"
						placeholderTextColor={colors.tabIconDefault}
					/>
					<Text style={[styles.label, { color: colors.text }]}>
						License Plate (Optional)
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								backgroundColor: colors.card,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						value={licensePlate}
						onChangeText={setLicensePlate}
						placeholder="ABC 123"
						placeholderTextColor={colors.tabIconDefault}
						autoCapitalize="characters"
					/>

					<TouchableOpacity
						style={[styles.button, { backgroundColor: colors.tint, marginTop: "auto" }]}
						onPress={handleSaveVehicle}
						disabled={isLoading}
					>
						<Text style={styles.buttonText}>
							{isLoading ? "Saving..." : "Save Vehicle"}
						</Text>
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1, padding: 20 },
	label: { fontSize: 16, fontWeight: "500", marginBottom: 8, marginLeft: 4 },
	input: {
		padding: 15,
		borderRadius: 10,
		borderWidth: 1,
		fontSize: 16,
		marginBottom: 20,
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 60,
	},
	button: { padding: 15, borderRadius: 10, alignItems: "center" },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default AddVehicleScreen;
