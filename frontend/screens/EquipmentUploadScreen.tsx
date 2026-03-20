import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Image,
	ActivityIndicator,
	ScrollView,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

// ── Route params ──────────────────────────────────────────────────────────────
type RouteParams = {
	serviceKey:   "battery" | "lockout" | "fuel" | "tire";
	serviceLabel: string;
	equipment:    string;
};

// ── Service colours (match ServiceHubScreen) ──────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
	battery: "#F59E0B",
	lockout: "#3B82F6",
	fuel:    "#10B981",
	tire:    "#8B5CF6",
};

// ─────────────────────────────────────────────────────────────────────────────
export const EquipmentUploadScreen = () => {
	const { colors } = useTheme();
	const navigation = useNavigation<any>();
	const route      = useRoute<RouteProp<{ params: RouteParams }, "params">>();
	const { token }  = useAuth();

	const { serviceKey, serviceLabel, equipment } = route.params;
	const accentColor = SERVICE_COLORS[serviceKey] ?? colors.primary;

	const [mediaUri,  setMediaUri]  = useState<string | null>(null);
	const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
	const [uploading, setUploading] = useState(false);

	// ── Pickers ───────────────────────────────────────────────────────────────
	const requestPermission = async (type: "camera" | "library"): Promise<boolean> => {
		if (type === "camera") {
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permission required", "Camera access is needed to take a photo.");
				return false;
			}
		} else {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permission required", "Photo library access is needed to choose a file.");
				return false;
			}
		}
		return true;
	};

	const pickFromCamera = async () => {
		if (!(await requestPermission("camera"))) return;
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			quality: 0.8,
			videoMaxDuration: 30,
		});
		if (!result.canceled && result.assets[0]) {
			const asset = result.assets[0];
			setMediaUri(asset.uri);
			setMediaType(asset.type === "video" ? "video" : "image");
		}
	};

	const pickFromGallery = async () => {
		if (!(await requestPermission("library"))) return;
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			quality: 0.8,
			videoMaxDuration: 60,
		});
		if (!result.canceled && result.assets[0]) {
			const asset = result.assets[0];
			setMediaUri(asset.uri);
			setMediaType(asset.type === "video" ? "video" : "image");
		}
	};

	// ── Upload ────────────────────────────────────────────────────────────────
	const handleUpload = async () => {
		if (!mediaUri || !mediaType) return;

		setUploading(true);
		try {
			const fileName = mediaUri.split("/").pop() ?? `equip.${mediaType === "video" ? "mp4" : "jpg"}`;
			const mimeType = mediaType === "video" ? "video/mp4" : "image/jpeg";

			const formData = new FormData();
			formData.append("file", {
				uri:  mediaUri,
				name: fileName,
				type: mimeType,
			} as any);

			const response = await fetch(
				`${API_URL}/driver/equipment/upload/${serviceKey}`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						// Do NOT set Content-Type — let fetch set it with boundary
					},
					body: formData,
				},
			);

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err?.message ?? `Upload failed (${response.status})`);
			}

			Alert.alert(
				"Submitted!",
				"Your equipment proof has been submitted. We'll review it within 24 hours.",
				[{ text: "OK", onPress: () => navigation.goBack() }],
			);
		} catch (err: any) {
			Alert.alert("Upload failed", err.message ?? "Something went wrong. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

				{/* Service info banner */}
				<View style={[styles.infoBanner, { backgroundColor: accentColor + "14", borderColor: accentColor + "40" }]}>
					<Ionicons name="information-circle-outline" size={20} color={accentColor} />
					<View style={{ flex: 1 }}>
						<Text style={[styles.infoTitle, { color: accentColor }]}>{serviceLabel}</Text>
						<Text style={[styles.infoBody, { color: colors.textMuted }]}>
							Please submit a photo or short video (max 30 sec) clearly showing your{" "}
							<Text style={{ fontWeight: "700", color: colors.text }}>{equipment}</Text>.
						</Text>
					</View>
				</View>

				{/* Media preview */}
				{mediaUri ? (
					<View style={[styles.previewWrap, { borderColor: colors.border }]}>
						<Image
							source={{ uri: mediaUri }}
							style={styles.previewImage}
							resizeMode="cover"
						/>
						{mediaType === "video" && (
							<View style={styles.videoOverlay}>
								<Ionicons name="videocam" size={28} color="#fff" />
								<Text style={styles.videoLabel}>Video selected</Text>
							</View>
						)}
						<TouchableOpacity
							style={[styles.clearBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
							onPress={() => { setMediaUri(null); setMediaType(null); }}
						>
							<Ionicons name="close" size={16} color={colors.danger} />
							<Text style={[styles.clearBtnText, { color: colors.danger }]}>Remove</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={[styles.pickerArea, { borderColor: colors.border, backgroundColor: colors.surface }]}>
						<Ionicons name="cloud-upload-outline" size={40} color={colors.textMuted} style={{ marginBottom: 10 }} />
						<Text style={[styles.pickerHint, { color: colors.textMuted }]}>
							Take a photo/video or choose from your gallery
						</Text>
					</View>
				)}

				{/* Picker buttons */}
				<View style={styles.pickerBtns}>
					<TouchableOpacity
						style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
						onPress={pickFromCamera}
						activeOpacity={0.8}
					>
						<Ionicons name="camera-outline" size={20} color={colors.text} />
						<Text style={[styles.pickerBtnText, { color: colors.text }]}>Camera</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
						onPress={pickFromGallery}
						activeOpacity={0.8}
					>
						<Ionicons name="images-outline" size={20} color={colors.text} />
						<Text style={[styles.pickerBtnText, { color: colors.text }]}>Gallery</Text>
					</TouchableOpacity>
				</View>

				{/* Upload CTA */}
				<TouchableOpacity
					style={[
						styles.uploadBtn,
						{
							backgroundColor: mediaUri && !uploading ? accentColor : colors.border,
							opacity: mediaUri && !uploading ? 1 : 0.5,
						},
					]}
					disabled={!mediaUri || uploading}
					onPress={handleUpload}
					activeOpacity={0.85}
				>
					{uploading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
							<Text style={styles.uploadBtnText}>Submit Proof</Text>
						</>
					)}
				</TouchableOpacity>

				<Text style={[styles.disclaimer, { color: colors.textMuted }]}>
					By submitting, you confirm the equipment shown is yours and meets safety standards.
					Approvals typically take up to 24 hours.
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	scroll:    { padding: 20, paddingBottom: 48 },

	infoBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		borderRadius: 14,
		borderWidth: 1,
		padding: 16,
		marginBottom: 20,
	},
	infoTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
	infoBody:  { fontSize: 13, lineHeight: 19 },

	previewWrap: {
		borderRadius: 16,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: 16,
	},
	previewImage: { width: "100%", height: 220 },
	videoOverlay: {
		position: "absolute",
		top: 0, left: 0, right: 0, bottom: 0,
		backgroundColor: "rgba(0,0,0,0.45)",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	videoLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
	clearBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 10,
		borderTopWidth: 1,
	},
	clearBtnText: { fontSize: 13, fontWeight: "600" },

	pickerArea: {
		borderRadius: 16,
		borderWidth: 1,
		borderStyle: "dashed",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 48,
		marginBottom: 16,
	},
	pickerHint: { fontSize: 13, textAlign: "center" },

	pickerBtns: { flexDirection: "row", gap: 12, marginBottom: 20 },
	pickerBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 14,
		borderWidth: 1,
	},
	pickerBtnText: { fontSize: 14, fontWeight: "600" },

	uploadBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		borderRadius: 14,
		marginBottom: 16,
	},
	uploadBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

	disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18, fontStyle: "italic" },
});
