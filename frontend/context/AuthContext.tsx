import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { api } from "../services/api";
import socketClient from "../services/socket";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	login: (email: string, pass: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const restoreSession = async () => {
			try {
				const storedUser = await AsyncStorage.getItem("@roadlift_user");
				if (storedUser) {
					setUser(JSON.parse(storedUser));
					await socketClient.connect();
				}
			} catch (e) {
				console.error("Failed to parse stored user", e);
			} finally {
				setIsLoading(false);
			}
		};
		restoreSession();
	}, []);

	const login = async (email: string, pass: string) => {
		// Backend returns: { success: true, data: { user: {...}, token: "..." } }
		const response = await api.post<any>("/auth/login", { email, password: pass });
		const payload = response.data.data;

		const loggedInUser: User = {
			id: payload.user.id,
			email: payload.user.email,
			name: payload.user.name,
			token: payload.token,
		};

		setUser(loggedInUser);
		await AsyncStorage.setItem("@roadlift_user", JSON.stringify(loggedInUser));
		await socketClient.connect();
	};

	const logout = async () => {
		setUser(null);
		await AsyncStorage.removeItem("@roadlift_user");
		socketClient.disconnect();
	};

	return (
		<AuthContext.Provider value={{ user, isLoading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
