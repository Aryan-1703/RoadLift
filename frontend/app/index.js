import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./_context/AuthContext";

const Index = () => {
	const router = useRouter();
	const { isAuthenticated, role, authLoaded } = useAuth();

	useEffect(() => {
		if (!authLoaded) return;

		if (isAuthenticated) {
			router.replace(role === "driver" ? "/driver-tabs" : "/tabs");
		} else {
			router.replace("/login");
		}
	}, [authLoaded, isAuthenticated, role]);

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
