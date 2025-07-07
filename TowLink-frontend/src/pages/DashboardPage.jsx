import React from "react";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
	const navigate = useNavigate();

	const handleLogout = () => {
		// Clear the authentication token from local storage
		localStorage.removeItem("token");
		// Navigate the user back to the login page
		navigate("/login");
	};

	return (
		<div style={{ padding: "50px", textAlign: "center" }}>
			<h1>Dashboard</h1>
			<p>Welcome to TowLink! This is your main control center.</p>
			<p>(The map and job list will go here)</p>
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
	);
};

export default DashboardPage;
