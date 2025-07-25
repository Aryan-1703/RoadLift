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
				{/* 2. SocketProvider is next. It also has no internal dependencies. */}
				<SocketProvider>
					{/* 3. AuthProvider is LAST. It depends on useSocket(), so it MUST be inside <SocketProvider>. */}
					<AuthProvider>
						{/* 4. The Stack navigator is the final child, so all components within it
                               can access every context (Auth, Socket, Theme). */}
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
							<Stack.Screen name="add-payment" options={{ presentation: "modal" }} />
						</Stack>
					</AuthProvider>
				</SocketProvider>
			</ThemeProvider>
		</StripeProvider>
	);
}
