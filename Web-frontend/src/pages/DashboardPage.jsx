import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Dashboard.module.css";

// Import specific icons from the 'react-icons' library
import {
	FaCarBattery,
	FaKey,
	FaTools,
	FaTruckMoving,
	FaSignOutAlt,
} from "react-icons/fa";

// Let's create a reusable card component right here for cleanliness
const ServiceCard = ({ icon, name, price, onClick, disabled = false }) => (
	<div
		className={`${styles.serviceCard} ${disabled ? styles.disabled : ""}`}
		onClick={!disabled ? onClick : null}
	>
		<div className={styles.iconWrapper}>{icon}</div>
		<div className={styles.serviceName}>{name}</div>
		<div className={styles.servicePrice}>{price}</div>
	</div>
);

const DashboardPage = () => {
	const navigate = useNavigate();
	const user = JSON.parse(localStorage.getItem("user"));

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		navigate("/login");
	};

	const handleServiceSelection = serviceName => {
		alert(`Selected: ${serviceName}`);
		// Later: navigate(`/request/${serviceName}`);
	};

	return (
		<div className={styles.dashboardContainer}>
			<header className={styles.header}>
				<h1 className={styles.welcomeTitle}>Welcome, {user?.name || "User"}</h1>
				<p className={styles.subtitle}>Ready to get you back on the road.</p>
			</header>

			<main>
				<div className={styles.serviceGrid}>
					<ServiceCard
						icon={<FaCarBattery />}
						name="Battery Boost"
						price="$59"
						onClick={() => handleServiceSelection("battery-boost")}
					/>
					<ServiceCard
						icon={<FaKey />}
						name="Car Lockout"
						price="$79"
						onClick={() => handleServiceSelection("car-lockout")}
					/>
					<ServiceCard
						icon={<FaTools />}
						name="Tire Change"
						price="$69"
						onClick={() => handleServiceSelection("flat-tire")}
					/>
					<ServiceCard
						icon={<FaTruckMoving />}
						name="Towing"
						price="Coming Soon"
						disabled={true}
					/>
				</div>
			</main>

			<footer>
				<button onClick={handleLogout} className={styles.logoutButton}>
					<FaSignOutAlt style={{ marginRight: "8px", verticalAlign: "middle" }} />
					Logout
				</button>
			</footer>
		</div>
	);
};

export default DashboardPage;
