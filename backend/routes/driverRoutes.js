const express = require("express");
const router = express.Router();
const {
	getAvailableJobs,
	acceptJob,
	updateJobStatus,
	completeJob,
	getEarnings,
	updateStatus,
	storePushToken,
	createStripeOnboardingLink,
	removePushToken,
} = require("../controllers/driverController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

// Jobs
router.get("/jobs/available", protect, protectDriver, getAvailableJobs);
router.put("/jobs/:jobId/accept", protect, protectDriver, acceptJob);
router.put("/jobs/:jobId/status", protect, protectDriver, updateJobStatus);
router.put("/jobs/:jobId/complete", protect, protectDriver, completeJob);

// Earnings
router.get("/earnings", protect, protectDriver, getEarnings);

// Online / offline toggle
router.put("/status", protect, protectDriver, updateStatus);

// Push tokens
router.post("/store-push-token", protect, storePushToken);
router.delete("/remove-push-token", protect, protectDriver, removePushToken);

// Stripe Connect
router.post("/stripe-onboarding", protect, protectDriver, createStripeOnboardingLink);

module.exports = router;
