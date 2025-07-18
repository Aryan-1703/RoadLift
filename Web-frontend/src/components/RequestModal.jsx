import React, { useState } from "react";
import styles from "./RequestModal.module.css";
import axios from "axios";

const RequestModal = ({ location, onClose }) => {
	const [vehicleMake, setVehicleMake] = useState("");
	const [vehicleModel, setVehicleModel] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async () => {
		if (!vehicleMake || !vehicleModel) {
			setError("Vehicle make and model are required.");
			return;
		}
		setError("");

		try {
			const token = localStorage.getItem("token");
			const response = await axios.post(
				"http://localhost:8001/api/jobs",
				{
					// Data we are sending to the backend
					customerLocation: {
						lat: location.lat,
						lon: location.lng,
					},
					vehicleMake: vehicleMake,
					vehicleModel: vehicleModel,
					notes: notes,
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			alert("Help is on the way!"); // Simple confirmation for now
			onClose(); // Close the modal on success
		} catch (err) {
			console.error("Failed to create job:", err);
			setError("Could not request tow. Please try again.");
		}
	};

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<h2 className={styles.modalTitle}>Confirm Tow Request</h2>
				<p>Your location has been set. Please provide your vehicle details.</p>

				<input
					type="text"
					className={styles.input}
					placeholder="Vehicle Make (e.g., Toyota)"
					value={vehicleMake}
					onChange={e => setVehicleMake(e.target.value)}
				/>
				<input
					type="text"
					className={styles.input}
					placeholder="Vehicle Model (e.g., Camry)"
					value={vehicleModel}
					onChange={e => setVehicleModel(e.target.value)}
				/>
				<textarea
					className={styles.input}
					placeholder="Optional notes for the driver (e.g., 'front right tire is flat')"
					rows="3"
					value={notes}
					onChange={e => setNotes(e.target.value)}
				></textarea>

				{error && <p style={{ color: "var(--error-color)" }}>{error}</p>}

				<div className={styles.buttonGroup}>
					<button onClick={onClose} className={`${styles.button} ${styles.cancelButton}`}>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						className={`${styles.button} ${styles.confirmButton}`}
					>
						Confirm Tow
					</button>
				</div>
			</div>
		</div>
	);
};

export default RequestModal;
