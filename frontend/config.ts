import { Platform } from "react-native";

// For Android Emulators, '10.0.2.2' points to your host machine's localhost.
// For iOS Simulators, 'localhost' works perfectly.
// If you are testing on a PHYSICAL device, change this to your computer's local Wi-Fi IP (e.g., '192.168.1.100')
export const BACKEND_URL = "http://10.0.0.206:3000";
// export const BACKEND_URL = "http://172.20.10.2:3000";

export const API_URL = `${BACKEND_URL}/api`;
