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
import axios from "axios";
import { API_URL } from "../config/constants";
import { useAuth } from "../_context/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SwipeableRow from "../_components/SwipeableRow";

// Component to display a single saved card, now with a "Default" badge
const CardRow = ({ brand, last4, isDefault, onSetDefault }) => {
	const { theme } = useTheme();
	const colors = Colors[theme];
	const brandIcon = brand ? brand.toLowerCase() : "credit-card";

	return (
		<TouchableOpacity
			style={[
				styles.cardRow,
				{ backgroundColor: colors.card, borderBottomColor: colors.border },
			]}
			onPress={onSetDefault}
			disabled={isDefault}
		>
			<FontAwesome5
				name={`cc-${brandIcon}`}
				size={24}
				color={colors.text}
				style={styles.cardIcon}
			/>
			<Text style={[styles.cardText, { color: colors.text }]}>
				Card ending in {last4}
			</Text>
			{isDefault ? (
				<View style={[styles.defaultBadge, { backgroundColor: colors.tint }]}>
					<Text style={styles.defaultBadgeText}>Default</Text>
				</View>
			) : (
				<FontAwesome5 name="chevron-right" size={16} color={colors.tabIconDefault} />
			)}
		</TouchableOpacity>
	);
};
const PaymentMethodsScreen = () => {
	// --- HOOKS & CONTEXTS ---
	const router = useRouter();
	const { token, user, login } = useAuth();
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const colors = Colors[theme];
	const [paymentMethods, setPaymentMethods] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchMethods = async () => {
		if (!token) return;
		!isLoading && setIsLoading(true); // Don't show full screen loader on refresh
		try {
			const response = await axios.get(`${API_URL}/payments/methods`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setPaymentMethods(response.data);
		} catch (error) {
			Alert.alert("Error", "Could not load your payment methods.");
		} finally {
			setIsLoading(false);
		}
	};
	useFocusEffect(
		React.useCallback(() => {
			fetchMethods();
		}, [token])
	);

	// --- NEW HANDLERS ---
	const handleSetDefault = async paymentMethodId => {
		try {
			await axios.put(
				`${API_URL}/payments/set-default`,
				{ paymentMethodId },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			// Update the user in our global AuthContext to reflect the new default
			const updatedUser = { ...user, defaultPaymentMethodId: paymentMethodId };
			await login({ token, user: updatedUser, role: "user" }, false);
			fetchMethods(); // Re-fetch to update the UI
		} catch (error) {
			Alert.alert("Error", "Could not set default card.");
		}
	};

	const handleDelete = paymentMethodId => {
		Alert.alert("Delete Card", "Are you sure you want to remove this payment method?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await axios.delete(`${API_URL}/payments/methods/${paymentMethodId}`, {
							headers: { Authorization: `Bearer ${token}` },
						});
						fetchMethods(); // Re-fetch the list to show the card is gone
					} catch (error) {
						Alert.alert("Error", "Could not delete card.");
					}
				},
			},
		]);
	};

	const renderPaymentMethod = ({ item }) => (
		<SwipeableRow onDelete={() => handleDelete(item.id)}>
			<CardRow
				brand={item.brand}
				last4={item.last4}
				isDefault={item.id === user?.defaultPaymentMethodId}
				onSetDefault={() => handleSetDefault(item.id)}
			/>
		</SwipeableRow>
	);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
				<ModalHeader title="Payment Methods" />

				{isLoading ? (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={colors.tint} />
					</View>
				) : (
					<FlatList
						data={paymentMethods}
						renderItem={renderPaymentMethod}
						keyExtractor={item => item.id}
						ListHeaderComponent={
							<View>
								<Text style={[styles.headerText, { color: colors.text }]}>
									Your Saved Cards
								</Text>
								<Text style={[styles.subHeaderText, { color: colors.tabIconDefault }]}>
									Tap to set as default, swipe left to remove.
								</Text>
							</View>
						}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<FontAwesome5
									name="credit-card"
									size={40}
									color={colors.tabIconDefault}
								/>
								<Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
									No payment methods saved.
								</Text>
							</View>
						}
						contentContainerStyle={{ flexGrow: 1 }}
					/>
				)}

				<TouchableOpacity
					style={[styles.addButton, { backgroundColor: colors.tint }]}
					onPress={() => router.push("/add-payment")}
				>
					<FontAwesome5 name="plus" size={16} color="#fff" />
					<Text style={styles.addButtonText}>Add New Method</Text>
				</TouchableOpacity>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	headerText: { fontSize: 28, fontWeight: "bold", paddingHorizontal: 20, paddingTop: 20 },
	subHeaderText: {
		fontSize: 14,
		paddingHorizontal: 20,
		paddingBottom: 10,
		marginBottom: 10,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		opacity: 0.7,
	},
	emptyText: { textAlign: "center", fontSize: 16, marginTop: 15 },
	cardRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 20,
		paddingHorizontal: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		backgroundColor: "white",
	}, // Add default background
	cardIcon: { width: 40, marginRight: 15, textAlign: "center" },
	cardText: { flex: 1, fontSize: 16, fontWeight: "500" },
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

export default PaymentMethodsScreen;
