import React, { createContext, useState, useEffect, useContext } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { registerForPushNotificationsAsync } from "../utils/notificationsRegister";
import * as Notifications from "expo-notifications";
import { API_URL } from "../config/constants";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authLoaded, setAuthLoaded] = useState(false);
	const router = useRouter();

	// Load session data from storage
	useEffect(() => {
		const loadAuthData = async () => {
			try {
				const storedToken = await AsyncStorage.getItem("token");
				const storedUser = await AsyncStorage.getItem("user");

				if (storedToken && storedUser) {
					const parsedUser = JSON.parse(storedUser);
					setUser(parsedUser);
					setToken(storedToken);
				}
				setAuthLoaded(true);
			} catch (e) {
				console.error("AuthContext: Failed to load auth data from storage", e);
			} finally {
				setIsLoading(false);
			}
		};
		loadAuthData();
	}, []);

	// Register push notification token if user is driver
	useEffect(() => {
		const setupPushNotifications = async () => {
			if (token && user?.role === "driver") {
				const pushToken = await registerForPushNotificationsAsync();
				if (pushToken) {
					try {
						await axios.post(
							`${API_URL}/driver/store-push-token`,
							{ token: pushToken },
							{ headers: { Authorization: `Bearer ${token}` } }
						);
					} catch (error) {
						console.error("AuthContext: Error saving push token:", error);
					}
				}
			}
		};
		setupPushNotifications();
	}, [token, user]);

	const login = async ({ token, user, role }) => {
		const fullUser = { ...user, role };
		await AsyncStorage.multiSet([
			["token", token],
			["user", JSON.stringify(fullUser)],
		]);
		setToken(token);
		setUser(fullUser);
		router.replace(role === "driver" ? "/driver-tabs" : "/tabs");
	};

	const logout = async () => {
		try {
			if (user?.role === "driver" && token) {
				await axios.delete(`${API_URL}/driver/remove-push-token`, {
					headers: { Authorization: `Bearer ${token}` },
				});
			}
		} catch (error) {
			console.error("AuthContext: Failed to remove push token on logout", error);
		}

		setUser(null);
		setToken(null);
		await AsyncStorage.multiRemove(["token", "user"]);
		router.replace("/login");
	};

	const value = {
		user,
		token,
		authLoaded,
		isAuthenticated: !!token,
		isLoading,
		role: user?.role ?? null,
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
