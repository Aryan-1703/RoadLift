import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { JobProvider } from "./context/JobContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

// Screens
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { JobFlowScreen } from "./screens/JobFlowScreen";
import { SettingsNavigator } from "./navigation/SettingsNavigator";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" color="#2563EB" />
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
					<Stack.Screen name="SettingsNav" component={SettingsNavigator} />
				</>
			)}
		</Stack.Navigator>
	);
};

export default function App() {
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<AuthProvider>
					<JobProvider>
						<ToastProvider>
							<NavigationContainer>
								<RootNavigator />
							</NavigationContainer>
						</ToastProvider>
					</JobProvider>
				</AuthProvider>
			</ThemeProvider>
		</SafeAreaProvider>
	);
}
