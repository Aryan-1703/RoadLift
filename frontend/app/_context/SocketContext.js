import React, { createContext, useContext, useState, useEffect } from "react";
import socketService from "../services/socket";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);

	const connectSocket = userId => {
		console.log("Connecting socket for user ID:", userId);
		socketService.connect(userId);
		const newSocket = socketService.getSocket();

		// Only set the new socket once it connects
		newSocket.on("connect", () => {
			console.log("Socket connected:", newSocket.id);
			setSocket(newSocket);
			setIsConnected(true);
		});

		newSocket.on("disconnect", () => {
			console.log("Socket disconnected");
			setIsConnected(false);
			setSocket(null);
		});
	};

	const disconnectSocket = () => {
		socketService.disconnect();
		setSocket(null);
		setIsConnected(false);
	};

	const value = {
		socket,
		isConnected,
		connectSocket,
		disconnectSocket,
	};

	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
