import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./_context/AuthContext";

const Index = () => {
	const router = useRouter();
	// 1. Get the correct, top-level 'role' state from the context
	const { isAuthenticated, isLoading, role } = useAuth();

	useEffect(() => {
		if (isLoading) {
			return;
		}

		if (isAuthenticated) {
			// 2. Use the top-level 'role' state for the check
			if (role === "driver") {
				router.replace("/driver-tabs");
			} else {
				router.replace("/tabs");
			}
		} else {
			// If not authenticated, send to login
			router.replace("/login");
		}
	}, [isLoading, isAuthenticated, role, router]); 

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
