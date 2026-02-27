import React, { useRef } from "react";
import {
	TouchableOpacity,
	Text,
	ActivityIndicator,
	StyleSheet,
	TouchableOpacityProps,
	View,
	Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface PrimaryButtonProps extends TouchableOpacityProps {
	title: string;
	variant?: "primary" | "secondary" | "danger";
	isLoading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
	title,
	variant = "primary",
	isLoading,
	disabled,
	style,
	onPressIn,
	onPressOut,
	...props
}) => {
	const { colors, isDarkMode } = useTheme();
	const scaleAnim = useRef(new Animated.Value(1)).current;

	const handlePressIn = (e: any) => {
		Animated.spring(scaleAnim, {
			toValue: 0.96,
			useNativeDriver: true,
		}).start();
		if (onPressIn) onPressIn(e);
	};

	const handlePressOut = (e: any) => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			useNativeDriver: true,
		}).start();
		if (onPressOut) onPressOut(e);
	};

	const getVariantStyles = () => {
		switch (variant) {
			case "secondary":
				return {
					bg: isDarkMode ? "#374151" : "#F3F4F6",
					text: colors.text,
				};
			case "danger":
				return {
					bg: colors.dangerBg,
					text: colors.danger,
				};
			case "primary":
			default:
				return {
					bg: disabled ? (isDarkMode ? "#1E3A8A" : "#93C5FD") : colors.primary,
					text: "#FFFFFF",
				};
		}
	};

	const vStyles = getVariantStyles();

	return (
		<Animated.View
			style={[{ transform: [{ scale: scaleAnim }] }, { width: "100%" }, style]}
		>
			<TouchableOpacity
				style={[
					styles.button,
					{ backgroundColor: vStyles.bg },
					(disabled || isLoading) && styles.disabled,
				]}
				disabled={disabled || isLoading}
				activeOpacity={0.9}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				{...props}
			>
				<View style={styles.content}>
					{isLoading ? (
						<ActivityIndicator color={vStyles.text} />
					) : (
						<Text style={[styles.text, { color: vStyles.text }]}>{title}</Text>
					)}
				</View>
			</TouchableOpacity>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	button: {
		width: "100%",
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	disabled: {
		opacity: 0.6,
	},
});
