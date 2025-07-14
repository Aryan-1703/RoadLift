import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Index = () => {
	const router = useRouter();

	useEffect(() => {
		const checkAuthStatusAndConnect = async () => {
			try {
				const token = await AsyncStorage.getItem("token");
				const userString = await AsyncStorage.getItem("user");

				if (token && userString) {
					const role = await AsyncStorage.getItem("role");

					// Navigate to the correct dashboard
					if (role === "driver") {
						router.replace("/driver-tabs");
					} else {
						router.replace("/tabs");
					}
				} else {
					router.replace("/login");
				}
			} catch (e) {
				console.error("Failed to check auth status:", e);
				router.replace("/login");
			}
		};

		checkAuthStatusAndConnect();
	}, []);

	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#007aff" />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f0f2f5",
	},
});
export default Index;
