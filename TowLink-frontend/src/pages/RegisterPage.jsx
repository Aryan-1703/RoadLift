import React, { useState } from "react";
import axios from "axios";
import styles from "./Auth.module.css"; // Import the CSS module

const RegisterPage = () => {
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState({ message: "", type: "" }); // {message, type: 'success' or 'error'}

	const handleSubmit = async e => {
		e.preventDefault();
		setStatus({ message: "", type: "" });

		try {
			const response = await axios.post("http://localhost:8001/api/auth/register/user", {
				name,
				phoneNumber,
				password,
			});

			console.log("Registration successful:", response.data);
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
					<input
						type="password"
						className={styles.input}
						placeholder="Password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
					/>
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
		</div>
	);
};

export default RegisterPage;
