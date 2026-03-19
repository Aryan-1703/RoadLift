import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Notifications from "expo-notifications";

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
import { ActiveJobBanner } from "./components/ActiveJobBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineBanner } from "./components/OfflineBanner";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY ?? "";
if (!STRIPE_PUBLISHABLE_KEY && __DEV__) {
	console.warn("[App] EXPO_PUBLIC_STRIPE_KEY is not set. Add it to frontend/.env");
}

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
					<Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
	const navigationRef = useRef<NavigationContainerRef<any>>(null);
	const [currentRoute, setCurrentRoute] = useState<string | null>(null);

	useEffect(() => {
		// Handle notification taps while the app is running (foreground/background)
		const subscription = Notifications.addNotificationResponseReceivedListener(response => {
			const data = response.notification.request.content.data as any;
			if (data?.screen === "DriverDashboardScreen" && navigationRef.current) {
				navigationRef.current.navigate("DriverFlow");
			}
		});

		// Handle cold-start: app opened by tapping a notification
		Notifications.getLastNotificationResponseAsync().then(response => {
			if (!response) return;
			const data = response.notification.request.content.data as any;
			if (data?.screen === "DriverDashboardScreen" && navigationRef.current) {
				navigationRef.current.navigate("DriverFlow");
			}
		});

		return () => subscription.remove();
	}, []);

	return (
		<ErrorBoundary>
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
										<NavigationContainer
											ref={navigationRef}
											onStateChange={() => {
												const name = navigationRef.current?.getCurrentRoute()?.name ?? null;
												setCurrentRoute(name);
											}}
											onReady={() => {
												setCurrentRoute(navigationRef.current?.getCurrentRoute()?.name ?? null);
											}}
										>
											<RootNavigator />
										</NavigationContainer>
										<ActiveJobBanner
											navigationRef={navigationRef}
											currentRoute={currentRoute}
										/>
									</DriverProvider>
								</JobProvider>
							</AuthProvider>
						</ToastProvider>
					</StripeProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
		<OfflineBanner />
		</ErrorBoundary>
	);
}
