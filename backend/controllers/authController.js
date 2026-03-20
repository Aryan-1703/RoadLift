const authService = require("../services/authServices");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Unified login for all roles — single endpoint, role returned in response.
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
	try {
		const { phoneNumber, password } = req.body;
		const { user, token } = await authService.login({ phoneNumber, password });

		return res.status(200).json({
			message: "Logged in successfully.",
			token,
			user: {
				id:          user.id,
				name:        user.name,
				email:       user.email,
				phoneNumber: user.phoneNumber,
				role:        user.role,           // 'CUSTOMER' | 'DRIVER' | 'ADMIN'
				isActive:    user.isActive,
				driverProfile: user.driverProfile || null,
				defaultVehicleId:       user.defaultVehicleId       || null,
				defaultPaymentMethodId: user.defaultPaymentMethodId || null,
			},
		});
	} catch (error) {
		// 401 for auth failures, 400 for validation
		const status = error.message.includes("required") ? 400 : 401;
		return res.status(status).json({ message: error.message });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/customer
// ─────────────────────────────────────────────────────────────────────────────
const registerCustomer = async (req, res) => {
	try {
		const { name, phoneNumber, email, password } = req.body;
		const { user, token } = await authService.registerCustomer({
			name,
			phoneNumber,
			email,
			password,
		});

		return res.status(201).json({
			message: "Customer registered successfully.",
			token,
			user: {
				id:          user.id,
				name:        user.name,
				email:       user.email,
				phoneNumber: user.phoneNumber,
				role:        user.role,
			},
		});
	} catch (error) {
		const status =
			error.message.includes("already exists") || error.message.includes("required")
				? 400
				: 500;
		return res.status(status).json({ message: error.message });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/driver
// ─────────────────────────────────────────────────────────────────────────────
const registerDriver = async (req, res) => {
	try {
		const { name, phoneNumber, email, password, driverProfile } = req.body;
		const { user, token } = await authService.registerDriver({
			name,
			phoneNumber,
			email,
			password,
			driverProfile,
		});

		return res.status(201).json({
			message: "Driver registered successfully.",
			token,
			user: {
				id:            user.id,
				name:          user.name,
				email:         user.email,
				phoneNumber:   user.phoneNumber,
				role:          user.role,
				driverProfile: user.driverProfile || null,
				unlockedServices: user.driverProfile?.unlockedServices ?? null,
			},
		});
	} catch (error) {
		const status =
			error.message.includes("already exists") || error.message.includes("required")
				? 400
				: 500;
		return res.status(status).json({ message: error.message });
	}
};

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
	try {
		const result = await authService.forgotPassword({ email: req.body.email });
		return res.json(result);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
	try {
		const { token, newPassword } = req.body;
		const result = await authService.resetPassword({ token, newPassword });
		return res.json(result);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

// Legacy shims — keep old endpoints alive during transition period.
// These simply delegate to the unified handlers above.
// Remove once mobile clients are fully updated to /api/auth/login.
// ─────────────────────────────────────────────────────────────────────────────
const loginUser   = login;
const loginDriver = login;
const registerUser = registerCustomer;

module.exports = {
	forgotPassword,
	resetPassword,
	login,
	loginUser,
	loginDriver,
	registerCustomer,
	registerDriver,
	registerUser,
};
