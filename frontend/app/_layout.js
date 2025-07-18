import { Stack } from "expo-router";
import { ThemeProvider } from "./_context/ThemeContext";
import { AuthProvider, useAuth } from "./_context/AuthContext";
import { SocketProvider } from "./_context/SocketContext";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "./utils/notificationsRegister";
import { API_URL } from "./config/constants";

function NotificationSetup() {
	const { user, token } = useAuth();

	useEffect(() => {
		const setupPushNotifications = async () => {
			const pushToken = await registerForPushNotificationsAsync();
			if (pushToken && user) {
				try {
					await fetch(`${API_URL}/store-push-token`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ token: pushToken }),
					});
				} catch (error) {
					console.error("Error saving push token:", error);
				}
			}
		};

		setupPushNotifications();

		const foregroundSubscription = Notifications.addNotificationReceivedListener(
			notification => {
				console.log("Notification received in foreground:", notification);
			}
		);

		const responseSubscription = Notifications.addNotificationResponseReceivedListener(
			response => {
				console.log("User tapped notification:", response);
				// Handle notification tap navigation here if needed
			}
		);

		return () => {
			foregroundSubscription.remove();
			responseSubscription.remove();
		};
	}, [user, token]);

	return null; // This component just runs logic, renders nothing
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<SocketProvider>
				<ThemeProvider>
					<NotificationSetup />
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
