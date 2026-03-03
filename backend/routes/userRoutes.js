// backend/routes/userRoutes.js
const express     = require("express");
const router      = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
	getProfile,
	updateProfile,
	requestPhoneChange,
	verifyPhoneChange,
	requestEmailChange,
	verifyEmailChange,
	getPreferences,
	updatePreferences,
	changePassword,
	getSessions,
	logoutAllSessions,
	deleteAccount,
} = require("../controllers/userController");

// Profile
router.get("/me",      protect, getProfile);
router.put("/profile", protect, updateProfile);

// Phone/email change with OTP
router.post("/request-phone-change", protect, requestPhoneChange);
router.post("/verify-phone-change",  protect, verifyPhoneChange);
router.post("/request-email-change", protect, requestEmailChange);
router.post("/verify-email-change",  protect, verifyEmailChange);

// Preferences
router.get("/preferences",  protect, getPreferences);
router.put("/preferences",  protect, updatePreferences);

// Security
router.post("/password/change",     protect, changePassword);
router.get("/sessions",             protect, getSessions);
router.post("/sessions/logout-all", protect, logoutAllSessions);
router.post("/delete",              protect, deleteAccount);

module.exports = router;
