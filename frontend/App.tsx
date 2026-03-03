import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { JobProvider } from "./context/JobContext";
import { DriverProvider } from "./context/DriverContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

// Screens
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { JobFlowScreen } from "./screens/JobFlowScreen";
import { SettingsNavigator } from "./navigation/SettingsNavigator";
import { DriverFlowScreen } from "./screens/DriverFlowScreen";

// ─────────────────────────────────────────────────────────────────────────────
// Your Stripe publishable key — set EXPO_PUBLIC_STRIPE_PK in .env
// For testing use the Stripe test key: pk_test_...
// ─────────────────────────────────────────────────────────────────────────────
const STRIPE_PK =
	process.env.EXPO_PUBLIC_STRIPE_PK ??
	"pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
	const { user, isLoading } = useAuth();
	const { colors } = useTheme();

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					// Use the actual theme background so there's no jarring flash
					backgroundColor: colors.background,
				}}
			>
				<ActivityIndicator
					size="large"
					color={colors.primary}
					style={{ transform: [{ scale: 1.5 }] }}
				/>
			</View>
		);
	}

	return (
		<Stack.Navigator id="Root" screenOptions={{ headerShown: false }}>
			{!user ? (
				<>
					<Stack.Screen name="Login"    component={LoginScreen} />
					<Stack.Screen name="Register" component={RegisterScreen} />
				</>
			) : user.role === "CUSTOMER" ? (
				<>
					<Stack.Screen name="JobFlow"     component={JobFlowScreen} />
					<Stack.Screen name="SettingsNav" component={SettingsNavigator} />
				</>
			) : (
				<>
					<Stack.Screen name="DriverFlow"  component={DriverFlowScreen} />
					<Stack.Screen name="SettingsNav" component={SettingsNavigator} />
				</>
			)}
		</Stack.Navigator>
	);
};

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<StripeProvider publishableKey={STRIPE_PK} urlScheme="roadlift">
						<ToastProvider>
							<AuthProvider>
								<JobProvider>
									<DriverProvider>
										<NavigationContainer>
											<RootNavigator />
										</NavigationContainer>
									</DriverProvider>
								</JobProvider>
							</AuthProvider>
						</ToastProvider>
					</StripeProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
