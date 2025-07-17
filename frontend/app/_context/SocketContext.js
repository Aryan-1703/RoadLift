import React, { createContext, useContext, useState, useEffect } from "react";
import socketService from "../services/socket";
import { useAuth } from "./AuthContext"; // ✅ Add this

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const { user, role, isAuthenticated } = useAuth(); // ✅ Pull auth context
	const [isConnected, setIsConnected] = useState(false);
	const [socket, setSocket] = useState(null);

	// 🔁 Automatically connect/disconnect socket based on auth
	useEffect(() => {
		if (isAuthenticated && user && role) {
			socketService.connect(user.id, role);
			const activeSocket = socketService.getSocket();

			const handleConnect = () => {
				console.log("✅ Socket connected:", activeSocket.id);
				setIsConnected(true);
			};

			const handleDisconnect = () => {
				console.log("❌ Socket disconnected");
				setIsConnected(false);
			};

			activeSocket.on("connect", handleConnect);
			activeSocket.on("disconnect", handleDisconnect);

			setSocket(activeSocket);

			return () => {
				activeSocket.off("connect", handleConnect);
				activeSocket.off("disconnect", handleDisconnect);
				activeSocket.disconnect(); // Clean up on logout
			};
		}
	}, [isAuthenticated, user, role]);

	const value = {
		socket,
		isConnected,
	};

	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
