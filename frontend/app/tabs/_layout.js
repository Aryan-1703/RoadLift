// app/(tabs)/_layout.js
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

export default function TabsLayout() {
	return (
		<Tabs>
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
	);
}
