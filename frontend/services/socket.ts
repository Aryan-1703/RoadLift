import { io, Socket as IOSocket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../config";

type Listener = { event: string; handler: (data: any) => void };

class SocketClient {
	public ioSocket: IOSocket | null = null;

	// Listeners registered before connect() finishes are queued here and
	// drained onto the real socket once io() creates it.
	private _pending: Listener[] = [];

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

			// Drain any listeners that were registered while ioSocket was null
			for (const { event, handler } of this._pending) {
				this.ioSocket.on(event, handler);
			}
			this._pending = [];

			this.ioSocket.on("connect", () => {
				console.log("[Socket] Connected to backend");
				if (user.id) {
					this.ioSocket!.emit("join-room", {
						userId: String(user.id),
						role: user.role,
					});
					// If driver was online before disconnect, re-join the drivers room
					if (user.role === "DRIVER" && user.isActive) {
						this.ioSocket!.emit("driver-online", { driverId: String(user.id) });
					}
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
		this._pending = [];
	}

	on(event: string, handler: (data: any) => void) {
		if (this.ioSocket) {
			this.ioSocket.on(event, handler);
		} else {
			// Socket not created yet — queue until connect() finishes
			this._pending.push({ event, handler });
		}
	}

	off(event: string, handler?: (data: any) => void) {
		if (this.ioSocket) {
			if (handler) {
				this.ioSocket.off(event, handler);
			} else {
				this.ioSocket.off(event);
			}
		} else {
			// Remove from pending queue so stale listeners aren't applied later
			if (handler) {
				this._pending = this._pending.filter(
					p => !(p.event === event && p.handler === handler),
				);
			} else {
				this._pending = this._pending.filter(p => p.event !== event);
			}
		}
	}

	emit(event: string, data?: any) {
		this.ioSocket?.emit(event, data);
	}
}

const socketClient = new SocketClient();
export default socketClient;
