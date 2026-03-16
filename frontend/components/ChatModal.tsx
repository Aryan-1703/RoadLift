import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	TextInput,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import socketClient from "../services/socket";

interface ChatMessage {
	id: string | number;
	jobId: string;
	senderId: string;
	senderRole: "CUSTOMER" | "DRIVER";
	text: string;
	createdAt: string;
}

interface Props {
	jobId: string;
	visible: boolean;
	onClose: () => void;
}

export const ChatModal = ({ jobId, visible, onClose }: Props) => {
	const { colors } = useTheme();
	const { user } = useAuth();

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [loading, setLoading] = useState(false);
	const flatListRef = useRef<FlatList>(null);

	// ── Load history when modal opens ────────────────────────────────────────
	useEffect(() => {
		if (!visible || !jobId) return;

		const loadHistory = async () => {
			setLoading(true);
			try {
				const res = await api.get<ChatMessage[]>(`/jobs/${jobId}/messages`);
				setMessages(res.data);
			} catch (err) {
				console.error("[Chat] Failed to load history:", err);
			} finally {
				setLoading(false);
			}
		};

		loadHistory();
	}, [visible, jobId]);

	// ── Join job room and listen for incoming messages ────────────────────────
	useEffect(() => {
		if (!visible || !jobId) return;

		// Join the job socket room so we receive messages
		socketClient.emit("join-job", jobId);

		const handleReceive = (msg: ChatMessage) => {
			setMessages(prev => {
				// Avoid duplicate if we already have this id (e.g., echoed back)
				if (prev.some(m => m.id === msg.id)) return prev;
				return [...prev, msg];
			});
		};

		socketClient.on("receive-message", handleReceive);

		return () => {
			socketClient.off("receive-message", handleReceive);
		};
	}, [visible, jobId]);

	// ── Scroll to bottom when new messages arrive ─────────────────────────────
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
		}
	}, [messages]);

	const handleSend = () => {
		const text = inputText.trim();
		if (!text || !jobId) return;

		socketClient.emit("send-message", { jobId, text });

		// Optimistically append the message so the sender sees it immediately
		const optimistic: ChatMessage = {
			id: `local-${Date.now()}`,
			jobId,
			senderId: String(user?.id ?? ""),
			senderRole: (user?.role ?? "CUSTOMER") as "CUSTOMER" | "DRIVER",
			text,
			createdAt: new Date().toISOString(),
		};
		setMessages(prev => [...prev, optimistic]);
		setInputText("");
	};

	const isMine = (msg: ChatMessage) =>
		String(msg.senderId) === String(user?.id);

	const formatTime = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const renderItem = ({ item }: { item: ChatMessage }) => {
		const mine = isMine(item);
		return (
			<View style={[styles.messageRow, mine ? styles.rowRight : styles.rowLeft]}>
				<View
					style={[
						styles.bubble,
						mine
							? [styles.bubbleMine, { backgroundColor: colors.primary }]
							: [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.border }],
					]}
				>
					<Text style={[styles.bubbleText, { color: mine ? "#fff" : colors.text }]}>
						{item.text}
					</Text>
					<Text
						style={[
							styles.timeText,
							{ color: mine ? "rgba(255,255,255,0.7)" : colors.textMuted },
						]}
					>
						{formatTime(item.createdAt)}
					</Text>
				</View>
			</View>
		);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
						<Ionicons name="close" size={24} color={colors.text} />
					</TouchableOpacity>
				</View>

				{/* Message list */}
				{loading ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator color={colors.primary} />
					</View>
				) : (
					<FlatList
						ref={flatListRef}
						data={messages}
						keyExtractor={item => String(item.id)}
						renderItem={renderItem}
						contentContainerStyle={styles.listContent}
						onContentSizeChange={() =>
							flatListRef.current?.scrollToEnd({ animated: false })
						}
						ListEmptyComponent={
							<Text style={[styles.emptyText, { color: colors.textMuted }]}>
								No messages yet. Say hi!
							</Text>
						}
					/>
				)}

				{/* Input */}
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					keyboardVerticalOffset={0}
				>
					<View
						style={[
							styles.inputRow,
							{
								backgroundColor: colors.card,
								borderTopColor: colors.border,
							},
						]}
					>
						<TextInput
							style={[
								styles.input,
								{
									backgroundColor: colors.background,
									color: colors.text,
									borderColor: colors.border,
								},
							]}
							placeholder="Type a message…"
							placeholderTextColor={colors.textMuted}
							value={inputText}
							onChangeText={setInputText}
							multiline
							maxLength={500}
							returnKeyType="send"
							onSubmitEditing={handleSend}
							blurOnSubmit={false}
						/>
						<TouchableOpacity
							onPress={handleSend}
							style={[
								styles.sendBtn,
								{
									backgroundColor: inputText.trim()
										? colors.primary
										: colors.border,
								},
							]}
							activeOpacity={0.7}
							disabled={!inputText.trim()}
						>
							<Ionicons name="send" size={18} color="#fff" />
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container:   { flex: 1 },
	header: {
		flexDirection:  "row",
		alignItems:     "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical:   14,
		borderBottomWidth: 1,
	},
	headerTitle: { fontSize: 18, fontWeight: "700" },
	closeBtn:    { padding: 4 },
	loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	listContent: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
	emptyText: {
		textAlign:  "center",
		marginTop:  40,
		fontSize:   14,
		fontStyle:  "italic",
	},
	messageRow: { marginVertical: 4 },
	rowLeft:    { alignItems: "flex-start" },
	rowRight:   { alignItems: "flex-end" },
	bubble: {
		maxWidth:      "75%",
		paddingHorizontal: 14,
		paddingVertical:    9,
		borderRadius:  18,
	},
	bubbleMine:  { borderBottomRightRadius: 4 },
	bubbleOther: { borderWidth: 1, borderBottomLeftRadius: 4 },
	bubbleText:  { fontSize: 15, lineHeight: 21 },
	timeText:    { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
	inputRow: {
		flexDirection:  "row",
		alignItems:     "flex-end",
		paddingHorizontal: 12,
		paddingVertical:   10,
		borderTopWidth: 1,
		gap: 10,
	},
	input: {
		flex:          1,
		borderWidth:   1,
		borderRadius:  22,
		paddingHorizontal: 16,
		paddingVertical:   10,
		fontSize:      15,
		maxHeight:     100,
	},
	sendBtn: {
		width:         44,
		height:        44,
		borderRadius:  22,
		alignItems:    "center",
		justifyContent: "center",
	},
});
