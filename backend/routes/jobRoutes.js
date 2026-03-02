const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
	createJob,
	getJobById,
	cancelJob,
	submitReview,
} = require("../controllers/jobController");

// POST   /api/jobs          — Customer creates a new job request
router.post("/", protect, createJob);

// GET    /api/jobs/history  — Job history for the authenticated user (customer OR driver)
// NOTE: Must be defined BEFORE /:id to prevent "history" being parsed as an ID
router.get("/history", protect, async (req, res) => {
	// Delegate to jobController — add getJobHistory to jobController.js
	// For now, inline a safe fallback so the route doesn't 404
	try {
		const { Job, User } = require("../models");
		const userId = req.user.id;
		const role = req.user.role;

		const whereClause = role === "DRIVER" ? { driverId: userId } : { customerId: userId };

		const jobs = await Job.findAll({
			where: whereClause,
			include: [
				{ model: User, as: "customer", attributes: ["id", "name"] },
				{ model: User, as: "driver", attributes: ["id", "name"] },
			],
			order: [["createdAt", "DESC"]],
			limit: 100,
		});

		res.json(jobs);
	} catch (err) {
		console.error("[jobRoutes] /history error:", err);
		res.status(500).json({ message: "Failed to fetch job history." });
	}
});

// GET    /api/jobs/:id      — Get single job by ID
router.get("/:id", protect, getJobById);

// PUT    /api/jobs/:jobId/cancel — Customer cancels a pending/accepted job
router.put("/:jobId/cancel", protect, cancelJob);

// POST   /api/jobs/:jobId/review — Customer submits rating after completion
router.post("/:jobId/review", protect, submitReview);

module.exports = router;
