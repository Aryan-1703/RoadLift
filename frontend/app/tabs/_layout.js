import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";
import { LocationProvider } from "../context/LocationContext";

export default function TabsLayout() {
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		// Wrap the entire tab layout with the LocationProvider
		<LocationProvider>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.tint,
					tabBarInactiveTintColor: colors.tabIconDefault,
					headerShown: false,
					tabBarStyle: {
						backgroundColor: colors.card,
						borderTopColor: colors.border,
					},
				}}
			>
				<Tabs.Screen
					name="dashboard"
					options={{
						title: "Dashboard",
						tabBarIcon: ({ color, size }) => (
							<FontAwesome5 name="th-large" size={size} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						title: "Settings",
						tabBarIcon: ({ color, size }) => (
							<FontAwesome5 name="cog" size={size} color={color} />
						),
					}}
				/>
			</Tabs>
		</LocationProvider>
	);
}
