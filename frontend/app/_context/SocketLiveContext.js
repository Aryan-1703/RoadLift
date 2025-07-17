import React, { createContext, useContext, useEffect, useState } from "react";
import socketService from "../services/socket"; // singleton

const SocketLiveContext = createContext();

export const useSocket = () => useContext(SocketLiveContext);

export const SocketLiveProvider = ({ children }) => {
	const [isConnected, setIsConnected] = useState(false);

	const connectSocket = (userId, role) => {
		socketService.connect(userId, role);
		setIsConnected(true);
	};

	const disconnectSocket = () => {
		socketService.disconnect();
		setIsConnected(false);
	};

	useEffect(() => {
		const socket = socketService.getSocket();
		if (!socket) return;

		socket.on("connect", () => setIsConnected(true));
		socket.on("disconnect", () => setIsConnected(false));

		return () => {
			socket.off("connect");
			socket.off("disconnect");
		};
	}, []);

	return (
		<SocketLiveContext.Provider value={{ connectSocket, disconnectSocket, isConnected }}>
			{children}
		</SocketLiveContext.Provider>
	);
};
