import { io, Socket as IOSocket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../config";

class SocketClient {
	public ioSocket: IOSocket | null = null;

	async connect() {
		if (this.ioSocket?.connected) return;

		try {
			const storedUser = await AsyncStorage.getItem("@roadlift_user");
			if (!storedUser) return;

			const user = JSON.parse(storedUser);
			const token = user.token;
			if (!token) return;

			this.ioSocket = io(BACKEND_URL, {
				auth: { token },
				transports: ["websocket"],
			});

			this.ioSocket.on("connect", () => {
				console.log("[Socket] Connected to backend");
				// Join personal room so backend can send targeted events (job-accepted,
				// job-completed, job-status-updated etc.) to this specific user.
				if (user.id) {
					this.ioSocket!.emit("join-room", {
						userId: String(user.id),
						role: user.role,
					});
				}
			});

			this.ioSocket.on("connect_error", err => {
				console.warn("[Socket] Connection Error:", err.message);
			});
		} catch (e) {
			console.error("[Socket] Init Error:", e);
		}
	}

	disconnect() {
		if (this.ioSocket) {
			this.ioSocket.disconnect();
			this.ioSocket = null;
		}
	}

	on(event: string, handler: (data: any) => void) {
		this.ioSocket?.on(event, handler);
	}

	off(event: string, handler?: (data: any) => void) {
		if (handler) {
			this.ioSocket?.off(event, handler);
		} else {
			this.ioSocket?.off(event);
		}
	}

	emit(event: string, data?: any) {
		this.ioSocket?.emit(event, data);
	}
}

const socketClient = new SocketClient();
export default socketClient;
