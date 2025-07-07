const authService = require("../services/authServices");
const { User, Driver } = require("../models");

// Controller for registering a User (customer)
const registerUser = async (req, res) => {
	try {
		const { createdRecord, token } = await authService.register(req.body, User);
		res.status(201).json({
			message: "User registered successfully!",
			user: createdRecord,
			token,
		});
	} catch (error) {
		console.error("User registration error:", error.message);
		// Send 400 for specific, known errors (like duplicates)
		if (error.message.includes("already exists") || error.message.includes("required")) {
			return res.status(400).json({ message: error.message });
		}
		// Send 500 for unexpected server errors
		res.status(500).json({ message: "Internal Server Error" });
	}
};

// Controller for registering a Driver
const registerDriver = async (req, res) => {
	try {
		const { createdRecord, token } = await authService.register(req.body, Driver);
		res.status(201).json({
			message: "Driver registered successfully!",
			driver: createdRecord,
			token,
		});
	} catch (error) {
		console.error("Driver registration error:", error.message);
		if (error.message.includes("already exists") || error.message.includes("required")) {
			return res.status(400).json({ message: error.message });
		}
		res.status(500).json({ message: "Internal Server Error" });
	}
};

module.exports = {
	registerUser,
	registerDriver,
};
