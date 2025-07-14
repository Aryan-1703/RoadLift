import { Stack } from "expo-router";
import { ThemeProvider } from "./_context/ThemeContext";
import { SocketProvider } from "./_context/SocketContext";
import { AuthProvider } from "./_context/AuthContext";

export default function RootLayout() {
	return (
		<ThemeProvider>
			<SocketProvider>
				<AuthProvider>
					<Stack
						screenOptions={{
							animation: "slide_from_right",
							headerShown: false,
						}}
					>
						<Stack.Screen name="index" />
						<Stack.Screen name="login" />
						<Stack.Screen name="register" />
						<Stack.Screen name="request-confirmation" options={{ headerShown: false }} />
						<Stack.Screen name="finding-driver" options={{ headerShown: false }} />
						<Stack.Screen
							name="active-job"
							options={{ headerShown: false, presentation: "modal" }}
						/>
						<Stack.Screen name="tabs" />
						<Stack.Screen name="live-tracking" options={{ headerShown: false }} />
					</Stack>
				</AuthProvider>
			</SocketProvider>
		</ThemeProvider>
	);
}
