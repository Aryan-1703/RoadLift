import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeOption } from "../types";

export const lightColors = {
	// ── Core (existing keys — unchanged API) ──────────────────────────────────
	background: "#f0f4f8",
	card: "#ffffff",
	text: "#0f172a",
	textMuted: "#64748b",
	border: "#e2e8f0",
	primary: "#1a6bff",
	danger: "#ef4444",
	dangerBg: "#fff5f5",

	// ── Extended tokens (used by new screen designs) ──────────────────────────
	textSecondary: "#1e293b",
	textFaint: "#94a3b8",
	sectionLabel: "#94a3b8",
	divider: "#e2e8f0",

	// surfaces
	surface: "#f8fafc",
	surfaceBorder: "#e2e8f0",
	inputBg: "#f8fafc",
	inputBorder: "#e2e8f0",

	// cards
	cardBorder: "#e2e8f0",

	// accent blue
	accent: "#1a6bff",
	accentText: "#1a6bff",
	accentBg: "rgba(26,107,255,0.08)",
	accentBorder: "rgba(26,107,255,0.20)",

	// accent green
	green: "#059669",
	greenBg: "rgba(5,150,105,0.08)",
	greenBorder: "rgba(5,150,105,0.20)",

	// accent amber
	amber: "#d97706",
	amberBg: "rgba(217,119,6,0.08)",
	amberBorder: "rgba(217,119,6,0.20)",

	// danger (extended)
	dangerBorder: "#fecaca",
	dangerIconBg: "#fee2e2",

	// chevrons / chip backgrounds
	arrowBg: "#f1f5f9",
	arrowIcon: "#cbd5e1",

	// shadows
	shadowColor: "#64748b",
	shadowOpacity: 0.08,

	// status dots
	online: "#059669",
	offline: "#9ca3af",

	// overlays
	overlay: "rgba(0,0,0,0.40)",

	// switch track (off state)
	switchTrackOff: "#e2e8f0",

	// footer brand
	footerBrand: "#1a6bff",
	footerVersion: "#cbd5e1",
} as const;

export const darkColors = {
	// ── Core (existing keys — unchanged API) ──────────────────────────────────
	background: "#060b18",
	card: "#0d1424",
	text: "#ffffff",
	textMuted: "#8a9ab5",
	border: "rgba(255,255,255,0.07)",
	primary: "#1a6bff",
	danger: "#f87171",
	dangerBg: "rgba(239,68,68,0.07)",

	// ── Extended tokens ───────────────────────────────────────────────────────
	textSecondary: "#e2e8f0",
	textFaint: "#4d6080",
	sectionLabel: "#4d6080",
	divider: "rgba(255,255,255,0.07)",

	// surfaces
	surface: "#111827",
	surfaceBorder: "rgba(255,255,255,0.05)",
	inputBg: "#0a1020",
	inputBorder: "rgba(255,255,255,0.10)",

	// cards
	cardBorder: "rgba(255,255,255,0.07)",

	// accent blue
	accent: "#1a6bff",
	accentText: "#60a5fa",
	accentBg: "rgba(26,107,255,0.15)",
	accentBorder: "rgba(26,107,255,0.30)",

	// accent green
	green: "#34d399",
	greenBg: "rgba(52,211,153,0.10)",
	greenBorder: "rgba(52,211,153,0.25)",

	// accent amber
	amber: "#f59e0b",
	amberBg: "rgba(245,158,11,0.12)",
	amberBorder: "rgba(245,158,11,0.25)",

	// danger (extended)
	dangerBorder: "rgba(239,68,68,0.18)",
	dangerIconBg: "rgba(239,68,68,0.10)",

	// chevrons / chip backgrounds
	arrowBg: "rgba(255,255,255,0.04)",
	arrowIcon: "#3d4f6b",

	// shadows
	shadowColor: "#000000",
	shadowOpacity: 0.25,

	// status dots
	online: "#34d399",
	offline: "#9ca3af",

	// overlays
	overlay: "rgba(0,0,0,0.60)",

	// switch track (off state)
	switchTrackOff: "#1f2d44",

	// footer brand
	footerBrand: "#1a6bff",
	footerVersion: "#2d3f57",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
// Widen every value to string | number so both lightColors and darkColors
// are assignable — without this, `typeof lightColors` locks each key to its
// exact literal (e.g. "#f0f4f8") and darkColors' different literals error.
export type Colors = {
	[K in keyof typeof lightColors]: (typeof lightColors)[K] extends number
		? number
		: string;
};

interface ThemeContextType {
	themeOption: ThemeOption;
	setThemeOption: (theme: ThemeOption) => Promise<void>;
	isDarkMode: boolean;
	colors: Colors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context + Provider
// ─────────────────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [themeOption, setThemeState] = useState<ThemeOption>("system");
	const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
		Appearance.getColorScheme(),
	);

	useEffect(() => {
		const loadTheme = async () => {
			try {
				const saved = await AsyncStorage.getItem("@roadlift_theme");
				if (saved) setThemeState(saved as ThemeOption);
			} catch (e) {
				console.error("Failed to load theme", e);
			}
		};
		loadTheme();

		const sub = Appearance.addChangeListener(({ colorScheme }) => {
			setSystemScheme(colorScheme);
		});
		return () => sub.remove();
	}, []);

	const setThemeOption = async (newTheme: ThemeOption) => {
		setThemeState(newTheme);
		try {
			await AsyncStorage.setItem("@roadlift_theme", newTheme);
		} catch (e) {
			console.error("Failed to save theme", e);
		}
	};

	const isDarkMode =
		themeOption === "dark" || (themeOption === "system" && systemScheme === "dark");

	const colors: Colors = isDarkMode ? darkColors : lightColors;

	return (
		<ThemeContext.Provider value={{ themeOption, setThemeOption, isDarkMode, colors }}>
			{children}
		</ThemeContext.Provider>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook  (same signature as before — zero changes needed in any screen)
// ─────────────────────────────────────────────────────────────────────────────
export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
};
