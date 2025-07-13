import React, { createContext, useState, useEffect, useContext } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
	const systemScheme = useColorScheme(); // 'dark', 'light', or 'null'
	const [theme, setTheme] = useState(systemScheme);

	useEffect(() => {
		const loadTheme = async () => {
			const savedTheme = await AsyncStorage.getItem("theme");
			if (savedTheme) {
				setTheme(savedTheme);
			} else {
				setTheme(systemScheme);
			}
		};
		loadTheme();
	}, [systemScheme]);

	const toggleTheme = async () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		await AsyncStorage.setItem("theme", newTheme);
	};

	const value = { theme, toggleTheme };

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
