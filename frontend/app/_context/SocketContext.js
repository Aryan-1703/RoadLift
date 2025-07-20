import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import socketService from "../services/socket";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const { user, isAuthenticated } = useAuth();
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);
	useEffect(() => {
		if (isAuthenticated && user && user.role) {
			socketService.connect(user.id, user.role);
			const s = socketService.getSocket();
			if (!s) {
				console.log("SocketService.getSocket() returned null");
				return;
			}

			const onConnect = () => {
				setIsConnected(true);

				// ✅ Rejoin rooms on reconnect
				s.emit("join-room", {
					userId: user.id,
					role: user.role,
				});
			};

			const onDisconnect = () => {
				setIsConnected(false);
			};
			s.on("connect", onConnect);
			s.on("disconnect", onDisconnect);
			setSocket(s);
			return () => {
				s.off("connect", onConnect);
				s.off("disconnect", onDisconnect);
				s.disconnect();
			};
		}
	}, [isAuthenticated, user]);

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	);
};
