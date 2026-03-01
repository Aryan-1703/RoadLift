import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeOption } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// "Warm Dispatch" Light Theme
// Inspired by premium automotive & emergency services aesthetics.
// Warm asphalt-dust backgrounds, crisp white cards, deep warm typography.
// ─────────────────────────────────────────────────────────────────────────────
export const lightColors = {
	// ── Core ─────────────────────────────────────────────────────────────────
	background: "#F0EDE7",       // warm asphalt-dust off-white
	card: "#FFFFFF",
	text: "#1B1916",             // near-black with warm undertone
	textMuted: "#6D6359",        // warm medium gray
	border: "#E2DDD6",           // warm light border
	primary: "#1A6BFF",
	danger: "#D93025",
	dangerBg: "#FEF2F2",

	// ── Extended tokens ───────────────────────────────────────────────────────
	textSecondary: "#2D2723",
	textFaint: "#9C9289",
	sectionLabel: "#9C9289",
	divider: "#E2DDD6",

	// surfaces
	surface: "#F7F4EF",
	surfaceBorder: "#E2DDD6",
	inputBg: "#F7F4EF",
	inputBorder: "#D4CFC8",

	// cards
	cardBorder: "#E2DDD6",

	// accent blue
	accent: "#1A6BFF",
	accentText: "#1A6BFF",
	accentBg: "rgba(26,107,255,0.07)",
	accentBorder: "rgba(26,107,255,0.18)",

	// accent green
	green: "#0B7B56",
	greenBg: "rgba(11,123,86,0.08)",
	greenBorder: "rgba(11,123,86,0.18)",

	// accent amber — premium warm gold for light theme personality
	amber: "#B87000",
	amberBg: "rgba(184,112,0,0.08)",
	amberBorder: "rgba(184,112,0,0.18)",

	// danger (extended)
	dangerBorder: "#FECACA",
	dangerIconBg: "#FEE2E2",

	// chevrons / chip backgrounds
	arrowBg: "#EDE9E2",
	arrowIcon: "#C4BDB4",

	// shadows — warm brown-tinted for depth
	shadowColor: "#5C4A3A",
	shadowOpacity: 0.10,

	// status dots
	online: "#0B7B56",
	offline: "#9C9289",

	// overlays
	overlay: "rgba(27,25,22,0.40)",

	// switch track (off state)
	switchTrackOff: "#D4CFC8",

	// footer brand
	footerBrand: "#1A6BFF",
	footerVersion: "#C4BDB4",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// "Midnight Highway" Dark Theme
// Deep navy cosmos, electric blue accents, glowing status indicators.
// ─────────────────────────────────────────────────────────────────────────────
export const darkColors = {
	// ── Core ─────────────────────────────────────────────────────────────────
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
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
};
