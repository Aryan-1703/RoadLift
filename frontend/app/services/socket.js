import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/constants";

class SocketService {
	socket = null;

	connect(userId, role) {
		if (this.socket?.connected) {
			console.log("Socket already connected.");
			return;
		}

		this.disconnect();

		this.socket = io(API_BASE_URL, {
			autoConnect: true,
			reconnection: true,
			query: { userId, role },
		});

		this.socket.on("connect", () => console.log("✅ Connected with ID:", this.socket.id));

		this.socket.on("disconnect", () => console.log("❌ Socket disconnected."));

		this.socket.on("connect_error", err =>
			console.error("Socket connection error:", err.message)
		);
	}

	disconnect() {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
	}

	getSocket() {
		return this.socket;
	}
}

export default new SocketService();
