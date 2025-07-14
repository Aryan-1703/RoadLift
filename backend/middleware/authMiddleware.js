const jwt = require("jsonwebtoken");
const { User, Driver } = require("../models");

const protect = async (req, res, next) => {
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		try {
			token = req.headers.authorization.split(" ")[1];
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// Check the role from the decoded token
			if (decoded.role === "user") {
				req.user = await User.findByPk(decoded.id);
			} else if (decoded.role === "driver") {
				req.user = await Driver.findByPk(decoded.id);
			}

			if (!req.user) {
				// If we couldn't find a user, deny access.
				return res
					.status(401)
					.json({ message: "Not authorized, user not found for this token." });
			}

			req.role = decoded.role; // Attach role for later use
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
