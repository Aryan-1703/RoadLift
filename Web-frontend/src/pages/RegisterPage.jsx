import React, { useState } from "react";
import axios from "axios";
import styles from "../css/Auth.module.css";
import { Link } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "../components/Icons";

// A simple eye icon SVG. We can use this for both pages.
const RegisterPage = () => {
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState({ message: "", type: "" }); // {message, type: 'success' or 'error'}
	const [isPasswordVisible, setIsPasswordVisible] = useState(false); // <-- NEW STATE

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	const handleSubmit = async e => {
		e.preventDefault();
		setStatus({ message: "", type: "" });

		try {
			const response = await axios.post("http://localhost:8001/api/auth/register/user", {
				name,
				phoneNumber,
				password,
			});

			setStatus({
				message: "Registration successful! You can now log in.",
				type: "success",
			});
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Registration failed. Please try again.";
			console.error("Registration error:", errorMessage);
			setStatus({ message: errorMessage, type: "error" });
		}
	};

	return (
		<div className={styles.authContainer}>
			<form className={styles.authForm} onSubmit={handleSubmit}>
				<h1 className={styles.title}>TowLink</h1>
				<p className={styles.subtitle}>Create your account</p>

				<div className={styles.inputGroup}>
					<input
						type="text"
						className={styles.input}
						placeholder="Full Name"
						value={name}
						onChange={e => setName(e.target.value)}
						required
					/>
				</div>
				<div className={styles.inputGroup}>
					<input
						type="tel" // Use type="tel" for phone numbers
						className={styles.input}
						placeholder="Phone Number"
						value={phoneNumber}
						onChange={e => setPhoneNumber(e.target.value)}
						required
					/>
				</div>
				<div className={styles.inputGroup}>
					<div className={styles.passwordInputWrapper}>
						{" "}
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
					Register
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
				Already have an account?{" "}
				<Link
					to="/login"
					style={{
						color: "var(--primary-color)",
						textDecoration: "none",
						fontWeight: "600",
					}}
				>
					Sign In
				</Link>
			</p>
		</div>
	);
};
export default RegisterPage;
