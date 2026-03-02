const express = require("express");
const router  = express.Router();
const {
	login,
	loginUser,
	loginDriver,
	registerCustomer,
	registerDriver,
	registerUser,
} = require("../controllers/authController");

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY ENDPOINTS (use these going forward)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Unified login for all roles. Role is determined from the users table.
 * Response includes role so the frontend can route accordingly.
 */
router.post("/login", login);

/**
 * POST /api/auth/register/customer
 */
router.post("/register/customer", registerCustomer);

/**
 * POST /api/auth/register/driver
 */
router.post("/register/driver", registerDriver);

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY SHIMS — kept for backward compatibility with existing mobile clients.
// All delegate to the unified handlers above.
// Deprecate once all clients are on the new endpoints.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login/user",        loginUser);
router.post("/login/driver",      loginDriver);
router.post("/register/user",     registerUser);   // old customer endpoint

module.exports = router;
