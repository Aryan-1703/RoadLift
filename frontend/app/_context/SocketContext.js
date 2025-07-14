import React, { createContext, useContext, useState, useEffect } from "react";
import socketService from "../services/socket"; // Your singleton socket manager

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const [isConnected, setIsConnected] = useState(
		socketService.getSocket()?.connected || false
	);

	const connectSocket = (userId, role) => {
		socketService.connect(userId, role);
	};

	const disconnectSocket = () => {
		if (socketService.getSocket()) {
			socketService.disconnect();
		}
	};

	useEffect(() => {
		const socket = socketService.getSocket();
		if (!socket) return;

		const handleConnect = () => setIsConnected(true);
		const handleDisconnect = () => setIsConnected(false);

		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);

		return () => {
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
		};
	}, []); // ✅ Empty dependency array — only runs once on mount

	const value = {
		socket: socketService.getSocket(), // Share actual socket instance
		isConnected,
		connectSocket,
		disconnectSocket,
	};

	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
