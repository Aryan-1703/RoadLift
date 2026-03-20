import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet, AppState, AppStateStatus } from "react-native";
import * as Network from "expo-network";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLL_INTERVAL_MS = 5000;

export const OfflineBanner = () => {
	const [isOffline, setIsOffline] = useState(false);
	const slideAnim = useRef(new Animated.Value(-60)).current;
	const insets = useSafeAreaInsets();

	const check = async () => {
		try {
			const state = await Network.getNetworkStateAsync();
			setIsOffline(!state.isConnected || !state.isInternetReachable);
		} catch {
			// If the check fails we assume online to avoid false offline banners
		}
	};

	useEffect(() => {
		check();

		// Poll while the app is in the foreground
		const interval = setInterval(check, POLL_INTERVAL_MS);

		// Also re-check when app comes back to foreground (e.g. user left + returned)
		const handleAppState = (next: AppStateStatus) => {
			if (next === "active") check();
		};
		const sub = AppState.addEventListener("change", handleAppState);

		return () => {
			clearInterval(interval);
			sub.remove();
		};
	}, []);

	useEffect(() => {
		Animated.spring(slideAnim, {
			toValue: isOffline ? insets.top : -60,
			useNativeDriver: true,
			tension: 80,
			friction: 10,
		}).start();
	}, [isOffline, insets.top]);

	return (
		<Animated.View
			style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
			pointerEvents="none"
		>
			<Ionicons name="cloud-offline-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
			<Text style={styles.text}>No internet connection</Text>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	banner: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 9999,
		backgroundColor: "#EF4444",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
	},
	text: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
