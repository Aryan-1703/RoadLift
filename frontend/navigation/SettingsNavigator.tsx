import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";

// Screens
import { AdminOverviewScreen } from "../screens/AdminOverviewScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { SecurityScreen } from "../screens/SecurityScreen";
import { ManageVehiclesScreen } from "../screens/ManageVehiclesScreen";
import { PaymentMethodsScreen } from "../screens/PaymentMethodsScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { HelpCenterScreen } from "../screens/HelpCenterScreen";
import { TermsScreen } from "../screens/TermsScreen";

const Stack = createNativeStackNavigator();

export const SettingsNavigator = () => {
	const { colors } = useTheme();

	return (
		<Stack.Navigator
			id="Settings"
			screenOptions={{
				headerStyle: { backgroundColor: colors.card },
				headerTintColor: colors.text,
				headerTitleStyle: { fontWeight: "bold" },
				headerShadowVisible: false,
			}}
		>
			<Stack.Screen
				name="AdminOverview"
				component={AdminOverviewScreen}
				options={{ title: "Settings" }}
			/>
			<Stack.Screen
				name="EditProfile"
				component={EditProfileScreen}
				options={{ title: "Edit Profile" }}
			/>
			<Stack.Screen
				name="Preferences"
				component={PreferencesScreen}
				options={{ title: "Appearance & Notifications" }}
			/>
			<Stack.Screen
				name="Security"
				component={SecurityScreen}
				options={{ title: "Security & Privacy" }}
			/>
			<Stack.Screen
				name="ManageVehicles"
				component={ManageVehiclesScreen}
				options={{ title: "Manage Vehicles" }}
			/>
			<Stack.Screen
				name="PaymentMethods"
				component={PaymentMethodsScreen}
				options={{ title: "Payment Methods" }}
			/>
			<Stack.Screen
				name="HelpCenter"
				component={HelpCenterScreen}
				options={{ title: "Help Center" }}
			/>
			<Stack.Screen
				name="Terms"
				component={TermsScreen}
				options={{ title: "Terms of Service" }}
			/>
		</Stack.Navigator>
	);
};
