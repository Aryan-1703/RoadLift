import React, { useContext } from "react";
import ThemeContext from "../_context/ThemeContext";
import { FaSun, FaMoon } from "react-icons/fa";

const SettingsPage = () => {
	const { theme, toggleTheme } = useContext(ThemeContext);

	return (
		<div style={{ padding: "30px 20px 80px 20px", color: "var(--text-primary)" }}>
			<h1>Settings</h1>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginTop: "20px",
					background: "var(--card-background)",
					padding: "20px",
					borderRadius: "12px",
					border: "1px solid var(--card-border)",
				}}
			>
				<span>Theme</span>
				<button
					onClick={toggleTheme}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						fontSize: "1.5rem",
						color: "var(--text-primary)",
					}}
				>
					{theme === "dark" ? <FaSun /> : <FaMoon />}
				</button>
			</div>
		</div>
	);
};

export default SettingsPage;
