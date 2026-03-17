import React, { useEffect, useState, useRef } from "react";
import {
	StyleSheet,
	View,
	StyleProp,
	ViewStyle,
	ActivityIndicator,
	Text,
	Alert,
	Linking,
	Platform,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Location as LocationType } from "../types";
import { useTheme } from "../context/ThemeContext";
import { getRouteCoordinates } from "../utils/mapUtils";
import { PrimaryButton } from "./PrimaryButton";

interface LiveMapProps {
	userLocation?: LocationType | null;
	providerLocation?: LocationType | null;
	style?: StyleProp<ViewStyle>;
	userTitle?: string;
	providerTitle?: string;
	onLocationUpdate?: (location: LocationType) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
	userLocation: externalUserLocation,
	providerLocation,
	style,
	userTitle = "You",
	providerTitle = "Provider",
	onLocationUpdate,
}) => {
	const { colors, isDarkMode } = useTheme();
	const mapRef = useRef<MapView>(null);
	const hasFittedRef = useRef(false);
	const [routeCoords, setRouteCoords] = useState<
		{ latitude: number; longitude: number }[]
	>([]);
	const [internalLocation, setInternalLocation] = useState<LocationType | null>(null);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [isLoading, setIsLoading] = useState(!externalUserLocation);

	const activeLocation = externalUserLocation || internalLocation;

	const requestLocation = async () => {
		setIsLoading(true);
		setPermissionDenied(false);
		try {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				setPermissionDenied(true);
				setIsLoading(false);
				return;
			}

			const location = await Location.getCurrentPositionAsync({});
			const newLocation = {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			};
			setInternalLocation(newLocation);
			if (onLocationUpdate) {
				onLocationUpdate(newLocation);
			}
		} catch (error) {
			console.error("Error fetching location:", error);
			setPermissionDenied(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!externalUserLocation) {
			requestLocation();
		} else {
			setIsLoading(false);
		}
	}, [externalUserLocation]);

	useEffect(() => {
		const fetchRoute = async () => {
			if (activeLocation && providerLocation) {
				const coords = await getRouteCoordinates(providerLocation, activeLocation);
				setRouteCoords(coords);
			}
		};

		fetchRoute();
	}, [activeLocation, providerLocation]);

	useEffect(() => {
		if (!mapRef.current || hasFittedRef.current) return;
		if (activeLocation && providerLocation) {
			hasFittedRef.current = true;
			mapRef.current.fitToCoordinates([activeLocation, providerLocation], {
				edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
				animated: true,
			});
		}
	}, [activeLocation, providerLocation]);

	if (isLoading) {
		return (
			<View
				style={[styles.centerContainer, style, { backgroundColor: colors.background }]}
			>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	if (permissionDenied && !externalUserLocation) {
		return (
			<View
				style={[styles.centerContainer, style, { backgroundColor: colors.background }]}
			>
				<Text style={[styles.errorText, { color: colors.text }]}>
					Location permission is required to show the map.
				</Text>
				<PrimaryButton
					title="Enable Location"
					onPress={() => Linking.openSettings()}
					style={styles.permissionBtn}
				/>
			</View>
		);
	}

	if (!activeLocation) {
		return null;
	}

	const mapStyle = isDarkMode
		? [
				{ elementType: "geometry", stylers: [{ color: "#242f3e" }] },
				{ elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
				{ elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
				{
					featureType: "administrative.locality",
					elementType: "labels.text.fill",
					stylers: [{ color: "#d59563" }],
				},
				{
					featureType: "road",
					elementType: "geometry",
					stylers: [{ color: "#38414e" }],
				},
				{
					featureType: "road",
					elementType: "geometry.stroke",
					stylers: [{ color: "#212a37" }],
				},
				{
					featureType: "road",
					elementType: "labels.text.fill",
					stylers: [{ color: "#9ca5b3" }],
				},
				{
					featureType: "road.highway",
					elementType: "geometry",
					stylers: [{ color: "#746855" }],
				},
				{
					featureType: "road.highway",
					elementType: "geometry.stroke",
					stylers: [{ color: "#1f2835" }],
				},
				{
					featureType: "road.highway",
					elementType: "labels.text.fill",
					stylers: [{ color: "#f3d19c" }],
				},
				{
					featureType: "water",
					elementType: "geometry",
					stylers: [{ color: "#17263c" }],
				},
				{
					featureType: "water",
					elementType: "labels.text.fill",
					stylers: [{ color: "#515c6d" }],
				},
				{
					featureType: "water",
					elementType: "labels.text.stroke",
					stylers: [{ color: "#17263c" }],
				},
			]
		: [];

	return (
		<MapView
			ref={mapRef}
			style={[styles.map, style]}
			provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
			customMapStyle={mapStyle}
			initialRegion={{
				latitude: activeLocation.latitude,
				longitude: activeLocation.longitude,
				latitudeDelta: 0.05,
				longitudeDelta: 0.05,
			}}
			showsUserLocation={true}
			showsMyLocationButton={false}
		>
			{providerLocation && (
				<Marker coordinate={providerLocation} title={providerTitle} pinColor="#111827" />
			)}
			{routeCoords.length > 0 && (
				<Polyline
					coordinates={routeCoords}
					strokeWidth={4}
					strokeColor={colors.primary}
				/>
			)}
		</MapView>
	);
};

const styles = StyleSheet.create({
	map: {
		flex: 1,
	},
	centerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	errorText: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 20,
	},
	permissionBtn: {
		width: "100%",
		maxWidth: 300,
	},
});
