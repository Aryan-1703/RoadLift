import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Index = () => {
	const router = useRouter();

	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const token = await AsyncStorage.getItem("token");
				const role = await AsyncStorage.getItem("role"); 

				if (token) {
					// Direct to the correct dashboard based on saved role
					if (role === "driver") {
						router.replace("/driver-tabs");
					} else {
						router.replace("/tabs");
					}
				} else {
					router.replace("/login");
				}
			} catch (e) {
				router.replace("/login");
			}
		};
		checkAuthStatus();
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
