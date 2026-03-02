const jwt  = require("jsonwebtoken");
const { User, DriverProfile } = require("../models");

// ─────────────────────────────────────────────────────────────────────────────
// protect — verifies JWT and attaches req.user + req.role
// ─────────────────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Not authorized, no token." });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// { id, role, iat, exp }

		// Single table lookup — no branching on role needed
		const user = await User.findByPk(decoded.id, {
			attributes: { exclude: ["password"] },
			include: [
				{
					model: DriverProfile,
					as: "driverProfile",
					required: false,
				},
			],
		});

		if (!user) {
			return res.status(401).json({ message: "Not authorized, account not found." });
		}

		if (user.deletedAt) {
			return res.status(401).json({ message: "This account has been deactivated." });
		}

		req.user = user;
		req.role = user.role; // 'CUSTOMER' | 'DRIVER' | 'ADMIN'
		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({ message: "Session expired, please log in again." });
		}
		return res.status(401).json({ message: "Not authorized, token invalid." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// requireRole — factory for role-based route guards
//
// Usage:
//   router.get('/admin', protect, requireRole('ADMIN'), handler)
//   router.get('/driver/jobs', protect, requireRole('DRIVER'), handler)
//   router.get('/shared', protect, requireRole('CUSTOMER', 'DRIVER'), handler)
// ─────────────────────────────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
	if (!req.role || !roles.includes(req.role)) {
		return res.status(403).json({
			message: `Access denied. Required role: ${roles.join(" or ")}.`,
		});
	}
	next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Named guards (backwards-compatible with existing route files)
// ─────────────────────────────────────────────────────────────────────────────
const protectDriver   = requireRole("DRIVER");
const protectAdmin    = requireRole("ADMIN");
const protectCustomer = requireRole("CUSTOMER");

module.exports = {
	protect,
	requireRole,
	protectDriver,
	protectAdmin,
	protectCustomer,
};
