import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Map from "../components/Map";
import RequestModal from "../components/RequestModal";

const DashboardPage = () => {
	const navigate = useNavigate();
	const [currentLocation, setCurrentLocation] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		// This effect runs once when the component mounts
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				position => {
					const { latitude, longitude } = position.coords;
					setCurrentLocation({
						lat: latitude,
						lng: longitude,
					});
				},
				error => {
					console.error("Error getting location", error);
					// Fallback to a default location if user denies permission
					setCurrentLocation({ lat: 37.7749, lng: -122.4194 });
				}
			);
		}
	}, []);

	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/login");
	};
	const openRequestModal = () => {
		if (currentLocation) {
			setIsModalOpen(true);
		} else {
			alert("Could not get your location. Please enable location services.");
		}
	};

	return (
		<div style={{ position: "relative", width: "100vw", height: "100vh" }}>
			{currentLocation ? (
				<Map center={currentLocation} />
			) : (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100%",
					}}
				>
					<p>Getting your location...</p>
				</div>
			)}

			{/* Logout button */}
			<div style={{ position: "absolute", top: "20px", right: "20px", zIndex: "10" }}>
				<button
					onClick={handleLogout}
					style={{
						padding: "10px 20px",
						fontSize: "1rem",
						backgroundColor: "#ff3b30",
						color: "white",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Logout
				</button>
			</div>
			{/* Request Tow button */}
			<div
				style={{
					position: "absolute",
					bottom: "30px",
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: "10",
				}}
			>
				<button
					onClick={openRequestModal}
					style={{
						padding: "15px 30px",
						fontSize: "1.2rem",
						fontWeight: "bold",
						backgroundColor: "#007aff",
						color: "white",
						border: "none",
						borderRadius: "30px",
						cursor: "pointer",
						boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
					}}
				>
					Request a Tow
				</button>
			</div>
			{/* The Modal itself - it will only render when isModalOpen is true */}
			{isModalOpen && (
				<RequestModal location={currentLocation} onClose={() => setIsModalOpen(false)} />
			)}
		</div>
	);
};
export default DashboardPage;
