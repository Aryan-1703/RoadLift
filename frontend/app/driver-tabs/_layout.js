import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../_context/ThemeContext"; // It can still USE hooks from parents
import Colors from "../_constants/Colors";
import { LocationProvider } from "../_context/LocationContext"; // The one provider it needs to ADD

export default function DriverTabsLayout() {
	// This component can consume contexts from its parents (like useTheme)
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
		// It provides the LocationContext to its own children (dashboard, profile)
		<LocationProvider>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.tint,
					headerShown: false,
					tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
				}}
			>
				<Tabs.Screen
					name="dashboard"
					options={{
						title: "Jobs",
						tabBarIcon: ({ color, size }) => (
							<FontAwesome5 name="list-alt" size={size} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						title: "Profile",
						tabBarIcon: ({ color, size }) => (
							<FontAwesome5 name="user-alt" size={size} color={color} />
						),
					}}
				/>
			</Tabs>
		</LocationProvider>
	);
}
