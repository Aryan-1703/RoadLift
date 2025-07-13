import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
// We can reuse the same theme logic
import { useTheme } from "../context/ThemeContext";
import Colors from "../constants/Colors";

export default function DriverTabsLayout() {
	const { theme } = useTheme();
	const colors = Colors[theme];

	return (
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
	);
}
