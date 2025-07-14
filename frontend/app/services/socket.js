import io from "socket.io-client";
import { API_BASE_URL } from "../config/constants";

class SocketService {
	socket = null;

	connect(userId, role) {
		if (this.socket && this.socket.connected) {
			console.log("SocketService: Already connected.");
			return;
		}

		this.disconnect(); // Clean up any old socket

		console.log(`SocketService: Connecting for userId: ${userId}, role: ${role}`);

		this.socket = io(API_BASE_URL, {
			reconnection: true,
			reconnectionDelay: 1000,
			autoConnect: true,
		});

		this.socket.on("connect", () => {
			console.log("SocketService: Connected with ID:", this.socket.id);
			this.socket.emit("join-room", { userId, role }); // Now using role-aware joining
		});

		this.socket.on("disconnect", () => {
			console.log("SocketService: Disconnected.");
		});

		this.socket.on("connect_error", err => {
			console.error("SocketService: Connection error:", err.message);
		});
	}

	disconnect() {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
			console.log("SocketService: Socket disconnected");
		}
	}

	// ✅ This is what your SocketProvider expects to access the socket
	getSocket() {
		return this.socket;
	}
}

const socketServiceInstance = new SocketService();
export default socketServiceInstance;
