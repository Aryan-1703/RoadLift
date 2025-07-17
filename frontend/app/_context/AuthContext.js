import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [role, setRole] = useState(null);
	const [authLoaded, setAuthLoaded] = useState(false);

	useEffect(() => {
		(async () => {
			const storedToken = await AsyncStorage.getItem("token");
			const storedUser = await AsyncStorage.getItem("user");
			const storedRole = await AsyncStorage.getItem("role");

			if (storedToken && storedUser && storedRole) {
				setToken(storedToken);
				setUser(JSON.parse(storedUser));
				setRole(storedRole);
			}
			setAuthLoaded(true);
		})();
	}, []);

	const login = async ({ token, user, role }) => {
		await AsyncStorage.multiSet([
			["token", token],
			["user", JSON.stringify(user)],
			["role", role],
		]);
		setToken(token);
		setUser(user);
		setRole(role);
		router.replace(role === "driver" ? "/driver-tabs" : "/tabs");
	};

	const logout = async () => {
		await AsyncStorage.multiRemove(["token", "user", "role"]);
		setUser(null);
		setToken(null);
		setRole(null);
		router.replace("/login");
	};

	return (
		<AuthContext.Provider
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
		</AuthContext.Provider>
	);
};
