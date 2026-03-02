import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, RegisterDTO } from "../types";
import { api } from "../services/api";
import socketClient from "../services/socket";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	login: (phoneNumber: string, pass: string, rememberEmail: boolean) => Promise<void>;
	register: (data: RegisterDTO) => Promise<void>;
	logout: () => Promise<void>;
	getRememberedEmail: () => Promise<string | null>;
	setRememberedEmail: (email: string | null) => Promise<void>;
	setUser: React.Dispatch<React.SetStateAction<User | null>>;
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

	const getRememberedEmail = async () => {
		try {
			return await AsyncStorage.getItem("@roadlift_remembered_email");
		} catch (e) {
			return null;
		}
	};

	const setRememberedEmail = async (email: string | null) => {
		try {
			if (email) {
				await AsyncStorage.setItem("@roadlift_remembered_email", email);
			} else {
				await AsyncStorage.removeItem("@roadlift_remembered_email");
			}
		} catch (e) {
			console.error("Failed to set remembered email", e);
		}
	};

	const login = async (phoneNumber: string, pass: string, rememberPhone: boolean) => {
		// FIX: was "/auth/login/user" — legacy dual-table endpoint, now removed.
		const response = await api.post<any>("/auth/login", {
			phoneNumber,
			password: pass,
		});
		const payload = response.data;

		const loggedInUser = {
			id: payload.user.id,
			email: payload.user.email,
			name: payload.user.name,
			phone: payload.user.phoneNumber || payload.user.phone || phoneNumber,
			role: payload.user.role || "CUSTOMER",
			vehicle: payload.user.vehicle,
			driverProfile: payload.user.driverProfile,
			token: payload.token,
			defaultVehicleId: payload.user.defaultVehicleId,
		};

		if (rememberPhone) {
			await AsyncStorage.setItem("@roadlift_remembered_phone", phoneNumber);
		} else {
			await AsyncStorage.removeItem("@roadlift_remembered_phone");
		}

		setUser(loggedInUser);
		await AsyncStorage.setItem("@roadlift_user", JSON.stringify(loggedInUser));
		await socketClient.connect();
	};

	const registerUser = async (data: RegisterDTO) => {
		const endpoint =
			data.role === "DRIVER" ? "/auth/register/driver" : "/auth/register/user";
		const response = await api.post<any>(endpoint, {
			name: data.name,
			phoneNumber: data.phone,
			email: data.email,
			password: data.password,
			vehicle: data.vehicle,
			driverProfile: data.driverProfile,
		});
		const payload = response.data;

		const loggedInUser: User = {
			id:
				payload.user?.id || payload.createdRecord?.id || payload.driver?.id || "temp_id",
			email:
				payload.user?.email ||
				payload.createdRecord?.email ||
				payload.driver?.email ||
				data.email,
			name:
				payload.user?.name ||
				payload.createdRecord?.name ||
				payload.driver?.name ||
				data.name,
			phone:
				payload.user?.phoneNumber ||
				payload.createdRecord?.phoneNumber ||
				payload.driver?.phoneNumber ||
				data.phone,
			role: data.role,
			vehicle:
				payload.user?.vehicle ||
				payload.createdRecord?.vehicle ||
				payload.driver?.vehicle ||
				data.vehicle,
			driverProfile:
				payload.user?.driverProfile ||
				payload.createdRecord?.driverProfile ||
				payload.driver?.driverProfile ||
				data.driverProfile,
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
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				login,
				register: registerUser,
				logout,
				getRememberedEmail,
				setRememberedEmail,
				setUser,
			}}
		>
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
