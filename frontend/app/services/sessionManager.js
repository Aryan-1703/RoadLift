import AsyncStorage from "@react-native-async-storage/async-storage";

export const getToken = async () => {
	return await AsyncStorage.getItem("token");
};

export const clearSession = async () => {
	await AsyncStorage.multiRemove(["token", "user", "role"]);
};
