import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const OfflineBanner = () => {
	const [isOffline, setIsOffline] = useState(false);
	const slideAnim = useRef(new Animated.Value(-60)).current;
	const insets = useSafeAreaInsets();

	useEffect(() => {
		const unsub = NetInfo.addEventListener(state => {
			setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
		});
		return () => unsub();
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
