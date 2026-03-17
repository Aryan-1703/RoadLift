const express = require("express");
const router = express.Router();
const { protect, protectDriver } = require("../middleware/authMiddleware");
const {
	createJob,
	getJobById,
	cancelJob,
	driverCancelJob,
	submitReview,
	getMessages,
} = require("../controllers/jobController");

// POST   /api/jobs  — Customer creates a new job request
router.post("/", protect, createJob);

router.get("/history", protect, async (req, res) => {
	try {
		const { Job, User } = require("../models");
		const userId = req.user.id;
		const role = req.user.role;

		// BUG WAS: `{ customerId: userId }` — that column doesn't exist.
		// The Job model uses `userId` for the customer FK.
		const whereClause = role === "DRIVER" ? { driverId: userId } : { userId: userId }; // ← FIXED

		const jobs = await Job.findAll({
			where: whereClause,
			include: [
				{ model: User, as: "customer", attributes: ["id", "name"] },
				{ model: User, as: "driver", attributes: ["id", "name"] },
			],
			order: [["createdAt", "DESC"]],
			limit: 100,
		});

		// Normalize through driverService so frontend gets consistent shape
		const { normalizeJob } = require("../services/driverService");
		res.json(jobs.map(normalizeJob));
	} catch (err) {
		console.error("[jobRoutes] /history error:", err);
		res.status(500).json({ message: "Failed to fetch job history." });
	}
});

// GET    /api/jobs/active  — Customer's current in-flight job (pending/accepted/arrived/in_progress)
// IMPORTANT: must come BEFORE /:id so "active" isn't matched as an ID
router.get("/active", protect, async (req, res) => {
	try {
		const { Job, User, Vehicle } = require("../models");
		const job = await Job.findOne({
			where: {
				userId: req.user.id,
				status: ["pending", "accepted", "arrived", "in_progress"],
			},
			include: [
				{ model: User,    as: "customer", attributes: ["id", "name", "phoneNumber"] },
				{ model: Vehicle, as: "vehicle",  attributes: ["id", "make", "model", "year", "color", "licensePlate"], required: false },
			],
			order: [["createdAt", "DESC"]],
		});
		if (!job) return res.json(null);
		const { normalizeJob } = require("../services/driverService");
		res.json(normalizeJob(job));
	} catch (err) {
		console.error("[jobRoutes] /active error:", err);
		res.status(500).json({ message: "Failed to fetch active job." });
	}
});

// GET    /api/jobs/:id  — Single job by ID
router.get("/:id", protect, getJobById);

// PUT    /api/jobs/:jobId/cancel        — Customer cancels (free if pending; $5 fee if driver assigned)
router.put("/:jobId/cancel", protect, cancelJob);

// PUT    /api/jobs/:jobId/driver-cancel — Driver cancels an accepted job; job is re-dispatched
router.put("/:jobId/driver-cancel", protect, protectDriver, driverCancelJob);

// POST   /api/jobs/:jobId/review  — Customer rates the completed job
router.post("/:jobId/review", protect, submitReview);

// GET    /api/jobs/:jobId/messages  — Chat history for a job
router.get("/:jobId/messages", protect, getMessages);

module.exports = router;
