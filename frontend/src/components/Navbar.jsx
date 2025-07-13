import React from "react";
import { NavLink } from "react-router-dom";
import styles from "../css/Navbar.module.css";
import { FaThLarge, FaCog } from "react-icons/fa";

const Navbar = () => {
	return (
		<nav className={styles.navbar}>
			<NavLink
				to="/dashboard"
				className={({ isActive }) =>
					isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
				}
			>
				<FaThLarge />
				<span>Dashboard</span>
			</NavLink>
			<NavLink
				to="/settings"
				className={({ isActive }) =>
					isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
				}
			>
				<FaCog />
				<span>Settings</span>
			</NavLink>
		</nav>
	);
};

export default Navbar;
