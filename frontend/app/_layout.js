import { Stack } from "expo-router";
import { ThemeProvider } from "./_context/ThemeContext";
import { AuthProvider } from "./_context/AuthContext";
import { SocketProvider } from "./_context/SocketContext";
export default function RootLayout() {
	return (
		<AuthProvider>
			<SocketProvider>
				<ThemeProvider>
					<Stack
						screenOptions={{
							animation: "slide_from_right",
							headerShown: false,
						}}
					>
						<Stack.Screen name="index" />
						<Stack.Screen name="login" />
						<Stack.Screen name="register" />
						<Stack.Screen name="request-confirmation" />
						<Stack.Screen name="finding-driver" />
						<Stack.Screen name="active-job" options={{ presentation: "modal" }} />
						<Stack.Screen name="tabs" />
						<Stack.Screen name="live-tracking" />
					</Stack>
				</ThemeProvider>
			</SocketProvider>
		</AuthProvider>
	);
}
