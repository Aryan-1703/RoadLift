// src/components/Map.jsx
import React from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const containerStyle = {
	width: "100%",
	height: "100%",
};

const Map = ({ center }) => {
	const { isLoaded } = useJsApiLoader({
		id: "google-map-script",
		googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
	});

	if (!isLoaded) {
		return <div>Loading Map...</div>;
	}

	return (
		<GoogleMap
			mapContainerStyle={containerStyle}
			center={center}
			zoom={15} // A bit more zoomed in for a personal location
			options={{
				streetViewControl: false,
				mapTypeControl: false,
				fullscreenControl: false,
			}}
		>
			{/* The marker will now show the user's actual location */}
			{center && <Marker position={center} />}
		</GoogleMap>
	);
};

export default React.memo(Map);
