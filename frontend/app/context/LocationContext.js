import React, { createContext, useState, useEffect, useContext } from "react";
import * as Location from "expo-location";

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
	const [location, setLocation] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const [permissionGranted, setPermissionGranted] = useState(false);

	const requestPermission = async () => {
		let { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") {
			setErrorMsg(
				"Permission to access location was denied. Please enable it in your phone settings to use the app."
			);
			setPermissionGranted(false);
			return false;
		}
		setPermissionGranted(true);
		return true;
	};

	useEffect(() => {
		// This effect runs once to get initial permission and location
		(async () => {
			const hasPermission = await requestPermission();
			if (hasPermission) {
				try {
					let currentLocation = await Location.getCurrentPositionAsync({});
					setLocation(currentLocation);
				} catch (error) {
					setErrorMsg("Could not fetch location. Please ensure GPS is enabled.");
				}
			}
		})();
	}, []);

	const value = {
		location,
		errorMsg,
		permissionGranted,
		requestPermission, // Expose this function in case we need to re-request
	};

	return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};
