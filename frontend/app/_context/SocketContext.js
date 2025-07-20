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

			const interval = setInterval(() => {
				const s = socketService.getSocket();
				if (!s) return;

				setSocket(s);

				const onConnect = () => {
					setIsConnected(true);
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

				clearInterval(interval); // Stop once connected
			}, 100); // Retry until socket is ready

			return () => {
				const s = socketService.getSocket();
				if (s) {
					s.off("connect");
					s.off("disconnect");
					s.disconnect();
				}
				clearInterval(interval);
			};
		}
	}, [isAuthenticated, user]);

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	);
};
