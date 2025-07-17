import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import socketService from "../services/socket";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const { user, role, isAuthenticated } = useAuth();
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (isAuthenticated && user && role) {
			socketService.connect(user.id, role);
			const s = socketService.getSocket();

			const onConnect = () => {
				setIsConnected(true);
				console.log("✅ Socket connected:", s.id);
			};

			const onDisconnect = () => {
				setIsConnected(false);
				console.log("❌ Socket disconnected");
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
	}, [isAuthenticated, user, role]);

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	);
};
