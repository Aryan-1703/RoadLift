import { Stack } from "expo-router";
import { ThemeProvider } from "./_context/ThemeContext";
import { AuthProvider } from "./_context/AuthContext";
import { SocketProvider } from "./_context/SocketContext";
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_PUBLISHABLE_KEY } from "./config/constants"; // Use your constants file

export default function RootLayout() {
	return (
		// 1. Providers with NO internal dependencies can go on the outside.
		// StripeProvider and ThemeProvider are self-contained.
		<StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
			<ThemeProvider>
				<AuthProvider>
					<SocketProvider>
						<Stack
							screenOptions={{
								animation: "slide_from_right",
								headerShown: false,
							}}
						>
							<Stack.Screen name="index" />
							<Stack.Screen name="login" />
							<Stack.Screen name="register" />
							<Stack.Screen
								name="request-confirmation"
								options={{ presentation: "modal" }}
							/>
							<Stack.Screen name="finding-driver" />
							<Stack.Screen name="active-job" options={{ presentation: "modal" }} />
							<Stack.Screen name="tabs" />
							<Stack.Screen name="driver-tabs" />
							<Stack.Screen name="live-tracking" />
							<Stack.Screen name="rate-experience" />
							<Stack.Screen name="add-payment" options={{ presentation: "modal" }} />
							<Stack.Screen name="payment-methods" />
						</Stack>
					</SocketProvider>
				</AuthProvider>
			</ThemeProvider>
		</StripeProvider>
	);
}
