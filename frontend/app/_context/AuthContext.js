import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useSocket } from "./SocketLiveContext";

const AuthSessionContext = createContext();

export const useAuthSession = () => useContext(AuthSessionContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [role, setRole] = useState(null);
	const [authLoaded, setAuthLoaded] = useState(false);

	const { connectSocket, disconnectSocket } = useSocket();

	useEffect(() => {
		(async () => {
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

			setAuthLoaded(true);
		})();
	}, []);

	const login = async ({ token, user, role }) => {
		await AsyncStorage.setItem("token", token);
		await AsyncStorage.setItem("user", JSON.stringify(user));
		await AsyncStorage.setItem("role", role);
		setToken(token);
		setUser(user);
		setRole(role);
		connectSocket(user.id, role);
		router.replace(role === "driver" ? "/driver-tabs" : "/tabs");
	};

	const logout = async () => {
		setToken(null);
		setUser(null);
		setRole(null);
		disconnectSocket();
		await AsyncStorage.multiRemove(["token", "user", "role"]);
		router.replace("/login");
	};

	return (
		<AuthSessionContext.Provider
			value={{
				user,
				token,
				role,
				isAuthenticated: !!token,
				authLoaded,
				login,
				logout,
			}}
		>
			{children}
		</AuthSessionContext.Provider>
	);
};
