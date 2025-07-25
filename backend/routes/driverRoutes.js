const express = require("express");
const router = express.Router();
const {
	getAvailableJobs,
	acceptJob,
	completeJob,
	updateStatus,
	storePushToken,
	createStripeOnboardingLink,
	removePushToken,
} = require("../controllers/driverController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

// GET /api/driver/jobs/available
// The request first checks for a valid token (protect),
// then checks if the token belongs to a driver (protectDriver).
router.get("/jobs/available", protect, protectDriver, getAvailableJobs);
router.put("/jobs/:jobId/accept", protect, protectDriver, acceptJob);
router.put("/jobs/:jobId/complete", protect, protectDriver, completeJob);
router.put("/status", protect, protectDriver, updateStatus);
router.post("/store-push-token", protect, protectDriver, storePushToken);
router.delete("/remove-push-token", protect, protectDriver, removePushToken);
router.post("/stripe-onboarding", protect, protectDriver, createStripeOnboardingLink);

module.exports = router;
