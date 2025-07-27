import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../css/Auth.module.css";
import { EyeIcon, EyeSlashIcon } from "../components/Icons";

const LoginPage = () => {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState({ message: "", type: "" });
	const [isPasswordVisible, setIsPasswordVisible] = useState(false); // <-- NEW STATE
	const navigate = useNavigate();

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	const handleSubmit = async e => {
		e.preventDefault();
		setStatus({ message: "", type: "" });

		try {
			const response = await axios.post("http://localhost:8001/api/auth/login/user", {
				phoneNumber,
				password,
			});
			console.log("Login successful:", response.data);
			localStorage.setItem("token", response.data.token);
			localStorage.setItem("user", JSON.stringify(response.data.user));
			setStatus({ message: "Login successful! Redirecting...", type: "success" });
			setTimeout(() => {
				navigate("/dashboard");
			}, 1000);
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Login failed. Please check your credentials.";
			console.error("Login error:", errorMessage);
			setStatus({ message: errorMessage, type: "error" });
		}
	};

	return (
		<div className={styles.authContainer}>
			<form className={styles.authForm} onSubmit={handleSubmit}>
				<h1 className={styles.title}>RoadLift</h1>
				<p className={styles.subtitle}>Welcome back! Please sign in.</p>
				<div className={styles.inputGroup}>
					<input
						type="tel"
						className={styles.input}
						placeholder="Phone Number"
						value={phoneNumber}
						onChange={e => setPhoneNumber(e.target.value)}
						required
					/>
				</div>
				<div className={styles.inputGroup}>
					<div className={styles.passwordInputWrapper}>
						<input
							type={isPasswordVisible ? "text" : "password"}
							className={styles.input}
							placeholder="Password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
						/>
						<span className={styles.eyeIcon} onClick={togglePasswordVisibility}>
							{isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
						</span>
					</div>
				</div>
				<button type="submit" className={styles.button}>
					Sign In
				</button>
				{status.message && (
					<p
						className={`${styles.message} ${
							status.type === "success" ? styles.success : styles.error
						}`}
					>
						{status.message}
					</p>
				)}
			</form>
			<p style={{ marginTop: "20px", color: "#6c757d" }}>
				Don't have an account?{" "}
				<Link
					to="/register"
					style={{
						color: "var(--primary-color)",
						textDecoration: "none",
						fontWeight: "600",
					}}
				>
					Register
				</Link>
			</p>
		</div>
	);
};

export default LoginPage;
