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

import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { JobFlowScreen } from "./screens/JobFlowScreen";
import { SettingsNavigator } from "./navigation/SettingsNavigator";
import { DriverFlowScreen } from "./screens/DriverFlowScreen";

const STRIPE_PUBLISHABLE_KEY =
	"pk_test_51RpW2T7C4sCNpdjEa0WyFFkGanThDJKGp9fRal7rUIZhfW8QO6X34JgM7C4Dg2rZgpZgJwS9F5YLniAcZfy4A2Cy00qvB9Gwqf";

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
					<Stack.Screen name="Login" component={LoginScreen} />
					<Stack.Screen name="Register" component={RegisterScreen} />
				</>
			) : user.role === "CUSTOMER" ? (
				<>
					<Stack.Screen name="JobFlow" component={JobFlowScreen} />
					<Stack.Screen name="SettingsNav" component={SettingsNavigator} />
				</>
			) : (
				<>
					<Stack.Screen name="DriverFlow" component={DriverFlowScreen} />
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
					<StripeProvider
						publishableKey={STRIPE_PUBLISHABLE_KEY}
						urlScheme="roadlift"
						merchantIdentifier="merchant.com.aryan1703.RoadLift"
					>
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
