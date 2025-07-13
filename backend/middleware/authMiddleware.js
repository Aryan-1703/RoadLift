const jwt = require("jsonwebtoken");
const { User, Driver } = require("../models");

const protect = async (req, res, next) => {
	let token;

	// Check for the token in the Authorization header
	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		try {
			// Get token from header (e.g., "Bearer <token>")
			token = req.headers.authorization.split(" ")[1];

			// Verify the token using our secret
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// The decoded payload contains the id and role we set during login
			// Attach the user/driver info to the request object
			if (decoded.role === "user") {
				req.user = await User.findByPk(decoded.id, {
					attributes: { exclude: ["password"] },
				});
			} else if (decoded.role === "driver") {
				req.user = await Driver.findByPk(decoded.id, {
					attributes: { exclude: ["password"] },
				});
			}

			// Add the role to the request for easy access
			req.role = decoded.role;

			if (!req.user) {
				return res.status(401).json({ message: "Not authorized, user not found" });
			}

			// Proceed to the next middleware or the route handler
			next();
		} catch (error) {
			console.error(error);
			return res.status(401).json({ message: "Not authorized, token failed" });
		}
	}

	if (!token) {
		return res.status(401).json({ message: "Not authorized, no token provided" });
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
