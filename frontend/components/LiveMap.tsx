import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, StyleProp, ViewStyle, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Location } from "../types";
import { useTheme } from "../context/ThemeContext";
import { getRouteCoordinates } from "../utils/mapUtils";

interface LiveMapProps {
	userLocation: Location | null;
	providerLocation?: Location | null;
	style?: StyleProp<ViewStyle>;
	userTitle?: string;
	providerTitle?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
	userLocation,
	providerLocation,
	style,
	userTitle = "You",
	providerTitle = "Provider",
}) => {
	const { colors, isDarkMode } = useTheme();
	const mapRef = useRef<MapView>(null);
	const [routeCoords, setRouteCoords] = useState<
		{ latitude: number; longitude: number }[]
	>([]);

	useEffect(() => {
		const fetchRoute = async () => {
			if (userLocation && providerLocation) {
				const coords = await getRouteCoordinates(providerLocation, userLocation);
				setRouteCoords(coords);
			}
		};

		fetchRoute();
	}, [userLocation, providerLocation]);

	useEffect(() => {
		if (userLocation && providerLocation && mapRef.current) {
			mapRef.current.fitToCoordinates([userLocation, providerLocation], {
				edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
				animated: true,
			});
		} else if (userLocation && mapRef.current) {
			mapRef.current.animateToRegion({
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			});
		}
	}, [userLocation, providerLocation]);

	if (!userLocation) {
		return (
			<View
				style={[styles.loadingContainer, style, { backgroundColor: colors.background }]}
			>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
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
			provider={PROVIDER_GOOGLE}
			customMapStyle={mapStyle}
			initialRegion={{
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			}}
			showsUserLocation={false}
		>
			<Marker coordinate={userLocation} title={userTitle} pinColor={colors.primary} />
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
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});
