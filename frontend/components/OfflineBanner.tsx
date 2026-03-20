import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet, AppState, AppStateStatus } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLL_INTERVAL_MS = 6000;
// Tiny public endpoint — just needs to respond 200; we discard the body
const PING_URL = "https://www.google.com/generate_204";

async function isOnline(): Promise<boolean> {
	try {
		const res = await fetch(PING_URL, { method: "HEAD", cache: "no-store" });
		return res.status < 400;
	} catch {
		return false;
	}
}

export const OfflineBanner = () => {
	const [offline, setOffline] = useState(false);
	const slideAnim = useRef(new Animated.Value(-60)).current;
	const insets = useSafeAreaInsets();

	const check = async () => {
		const online = await isOnline();
		setOffline(!online);
	};

	useEffect(() => {
		check();
		const interval = setInterval(check, POLL_INTERVAL_MS);
		const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
			if (next === "active") check();
		});
		return () => {
			clearInterval(interval);
			sub.remove();
		};
	}, []);

	useEffect(() => {
		Animated.spring(slideAnim, {
			toValue: offline ? insets.top : -60,
			useNativeDriver: true,
			tension: 80,
			friction: 10,
		}).start();
	}, [offline, insets.top]);

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
