// towlink-mobile/services/socket.js

import io from "socket.io-client";
import { API_BASE_URL } from "../config/constants";

class SocketService {
	// This will hold our single socket instance
	socket = null;

	/**
	 * Connects to the Socket.IO server and joins the user's private room.
	 * This method is now "idempotent" - safe to call multiple times.
	 * @param {string | number} userId - The ID of the user to connect for.
	 */
	connect(userId) {
		// --- THIS IS THE CRUCIAL FIX ---
		// If the socket already exists and is actively connected, do nothing further.
		if (this.socket && this.socket.connected) {
			console.log(
				"SocketService: Connection already established. Aborting new connection attempt."
			);
			return;
		}

		// Disconnect any lingering socket just in case it's in a weird state
		this.disconnect();

		console.log(`SocketService: Attempting a new connection for user ID: ${userId}`);

		// Establish the new connection
		this.socket = io(API_BASE_URL, {
			// Options to help with reliability
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 5,
		});

		// --- SETUP EVENT LISTENERS FOR THE NEW SOCKET ---

		this.socket.on("connect", () => {
			console.log("SocketService: Successfully connected with ID:", this.socket.id);
			// Once connected, join the user-specific room
			this.socket.emit("join-room", userId);
		});

		this.socket.on("disconnect", () => {
			console.log("SocketService: Disconnected.");
			// Important: Set socket to null on disconnect to allow for a clean reconnect later
			this.socket = null;
		});

		this.socket.on("connect_error", err => {
			console.error("SocketService: A connection error occurred!", err.message);
		});
	}

	/**
	 * Disconnects the current socket if it exists.
	 */
	disconnect() {
		if (this.socket) {
			console.log("SocketService: Disconnecting existing socket...");
			this.socket.disconnect();
			this.socket = null;
		}
	}

	/**
	 * Returns the current socket instance.
	 * @returns {Socket | null}
	 */
	getSocket() {
		return this.socket;
	}
}

// Create and export a single, shared instance of the service for the entire app
const socketServiceInstance = new SocketService();
export default socketServiceInstance;
