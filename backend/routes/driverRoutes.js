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
	getPayoutStatus,
} = require("../controllers/driverController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

// Jobs
router.get("/jobs/active", protect, protectDriver, async (req, res) => {
	try {
		const { Job, User, Vehicle } = require("../models");
		const job = await Job.findOne({
			where: {
				driverId: req.user.id,
				status:   ["accepted", "arrived", "in_progress"],
			},
			include: [
				{ model: User,    as: "customer", attributes: ["id", "name", "phoneNumber"] },
				{ model: Vehicle, as: "vehicle",  attributes: ["id", "make", "model", "year", "color", "licensePlate"], required: false },
			],
			order: [["updatedAt", "DESC"]],
		});
		if (!job) return res.json(null);
		const { normalizeJob } = require("../services/driverService");
		res.json(normalizeJob(job));
	} catch (err) {
		console.error("[driverRoutes] /jobs/active error:", err);
		res.status(500).json({ message: "Failed to fetch active job." });
	}
});
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
router.get("/payout-status",      protect, protectDriver, getPayoutStatus);

module.exports = router;
