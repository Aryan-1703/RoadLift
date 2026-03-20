import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";

// ── Screens ──────────────────────────────────────────────────────────────────
import { AdminOverviewScreen } from "../screens/AdminOverviewScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { SecurityScreen } from "../screens/SecurityScreen";
import { ManageVehiclesScreen } from "../screens/ManageVehiclesScreen";
import { PaymentMethodsScreen } from "../screens/PaymentMethodsScreen";
import { HelpCenterScreen } from "../screens/HelpCenterScreen";
import { TermsScreen } from "../screens/TermsScreen";
import { JobHistoryScreen } from "../screens/JobHistoryScreen";
import { StripeOnboardingScreen } from "../screens/StripeOnboardingScreen";
import { ServiceHubScreen } from "../screens/ServiceHubScreen";
import { EquipmentUploadScreen } from "../screens/EquipmentUploadScreen";

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
			{/* Hub */}
			<Stack.Screen
				name="AdminOverview"
				component={AdminOverviewScreen}
				options={{ title: "Settings" }}
			/>

			{/* Account */}
			<Stack.Screen
				name="EditProfile"
				component={EditProfileScreen}
				options={{ title: "Edit Profile" }}
			/>
			<Stack.Screen
				name="PaymentMethods"
				component={PaymentMethodsScreen}
				options={{ title: "Payment Methods" }}
			/>
			<Stack.Screen
				name="ManageVehicles"
				component={ManageVehiclesScreen}
				options={{ title: "My Vehicles" }}
			/>

			{/* NEW: Job history for both customers and drivers */}
			<Stack.Screen
				name="JobHistory"
				component={JobHistoryScreen}
				options={{ title: "Job History" }}
			/>

			{/* NEW: Stripe Connect onboarding for drivers */}
			<Stack.Screen
				name="StripeOnboarding"
				component={StripeOnboardingScreen}
				options={{ title: "Set Up Payouts" }}
			/>

			{/* Preferences */}
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

			{/* Driver: Service unlock */}
			<Stack.Screen
				name="ServiceHub"
				component={ServiceHubScreen}
				options={{ title: "Service Hub" }}
			/>
			<Stack.Screen
				name="EquipmentUpload"
				component={EquipmentUploadScreen}
				options={({ route }: any) => ({ title: route.params?.serviceLabel ?? "Upload Equipment" })}
			/>

			{/* Support */}
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
