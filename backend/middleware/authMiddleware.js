const jwt = require("jsonwebtoken");
const { User, Driver } = require("../models");

const protect = async (req, res, next) => {
	let token;

	// --- Add this for clear debugging ---
	console.log("\n--- RUNNING PROTECT MIDDLEWARE ---");

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		try {
			token = req.headers.authorization.split(" ")[1];
			console.log("1. Token found:", token ? "Yes" : "No");

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			// --- This is the most important log ---
			console.log("2. Decoded JWT Payload:", decoded);

			// Check the role from the decoded token
			if (decoded.role === "user") {
				console.log(`3. Role is 'user'. Searching Users table for ID: ${decoded.id}`);
				req.user = await User.findByPk(decoded.id);
			} else if (decoded.role === "driver") {
				console.log(`3. Role is 'driver'. Searching Drivers table for ID: ${decoded.id}`);
				req.user = await Driver.findByPk(decoded.id);
			}

			// --- This log will tell us if the user was found in the DB ---
			console.log(
				"4. User found in database:",
				req.user ? "Yes" : "No. THIS IS THE PROBLEM."
			);

			if (!req.user) {
				// If we couldn't find a user, deny access.
				return res
					.status(401)
					.json({ message: "Not authorized, user not found for this token." });
			}

			req.role = decoded.role; // Attach role for later use
			console.log("5. Middleware success. Proceeding to controller...");
			next(); // Proceed to the next step (the controller)
		} catch (error) {
			console.error("--- ERROR IN PROTECT MIDDLEWARE ---", error);
			res.status(401).json({ message: "Not authorized, token failed" });
		}
	}

	if (!token) {
		res.status(401).json({ message: "Not authorized, no token" });
	}
};
const protectDriver = (req, res, next) => {
	// This middleware should run AFTER the 'protect' middleware
	if (req.role && req.role === "driver") {
		next();
	} else {
		res.status(403).json({ message: "Forbidden: Driver access required." });
	}
};

module.exports = { protect, protectDriver };
