import { Stack } from "expo-router";
import { ThemeProvider } from "./context/ThemeContext";

export default function RootLayout() {
	return (
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
				<Stack.Screen name="request-confirmation" options={{ headerShown: false }} />
				<Stack.Screen name="finding-driver" options={{ headerShown: false }} />
				<Stack.Screen name="tabs" />
			</Stack>
		</ThemeProvider>
	);
}
