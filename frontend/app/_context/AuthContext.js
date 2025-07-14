import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "./SocketContext";
import { router } from "expo-router";
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [role, setRole] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authLoaded, setAuthLoaded] = useState(false);

	const { connectSocket, disconnectSocket } = useSocket();

	useEffect(() => {
		(async () => {
			try {
				const storedToken = await AsyncStorage.getItem("token");
				const storedUser = await AsyncStorage.getItem("user");
				const storedRole = await AsyncStorage.getItem("role");

				if (storedToken && storedUser && storedRole) {
					const parsedUser = JSON.parse(storedUser);
					setToken(storedToken);
					setUser(parsedUser);
					setRole(storedRole);
					connectSocket(parsedUser.id, storedRole);
				}
			} catch (err) {
				console.error("Error loading auth data:", err);
			} finally {
				setIsLoading(false);
				setAuthLoaded(true); // ✅ mark auth fully loaded
			}
		})();
	}, []);

	const login = async ({ token, user, role }) => {
		try {
			await AsyncStorage.setItem("token", token);
			await AsyncStorage.setItem("user", JSON.stringify(user));
			await AsyncStorage.setItem("role", role);

			setToken(token);
			setUser(user);
			setRole(role);

			connectSocket(user.id, role);
			router.replace(role === "driver" ? "/driver-tabs" : "/tabs");
		} catch (err) {
			console.error("Login error:", err);
		}
	};

	const logout = async () => {
		try {
			setUser(null);
			setToken(null);
			setRole(null);
			await AsyncStorage.multiRemove(["token", "user", "role"]);
			disconnectSocket();

			// Optional force redirect (immediate)
			router.replace("/login");
		} catch (err) {
			console.error("Logout error:", err);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				token,
				role,
				isAuthenticated: !!token,
				isLoading,
				authLoaded,
				login,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
