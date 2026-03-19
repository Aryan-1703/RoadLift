import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface State {
	hasError: boolean;
	error: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error: error?.message ?? "Unknown error" };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("[ErrorBoundary] Caught:", error, info.componentStack);
	}

	handleRestart = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (!this.state.hasError) return this.props.children;

		return (
			<View style={styles.container}>
				<View style={styles.icon}>
					<Ionicons name="warning-outline" size={52} color="#F59E0B" />
				</View>
				<Text style={styles.title}>Something went wrong</Text>
				<Text style={styles.message}>
					The app ran into an unexpected error. Your data is safe.
				</Text>
				{this.state.error ? (
					<Text style={styles.detail}>{this.state.error}</Text>
				) : null}
				<TouchableOpacity style={styles.btn} onPress={this.handleRestart} activeOpacity={0.8}>
					<Text style={styles.btnText}>Restart App</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#0a0a0a",
		padding: 32,
	},
	icon: {
		width: 88,
		height: 88,
		borderRadius: 44,
		backgroundColor: "#F59E0B18",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 10, textAlign: "center" },
	message: { fontSize: 15, color: "#9ca3af", textAlign: "center", lineHeight: 22, marginBottom: 12 },
	detail: {
		fontSize: 12, color: "#6b7280", textAlign: "center", marginBottom: 28,
		fontFamily: "monospace", padding: 12, backgroundColor: "#111", borderRadius: 8,
	},
	btn: {
		backgroundColor: "#1A6BFF",
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 14,
		marginTop: 8,
	},
	btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
