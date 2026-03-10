const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
	createJob,
	getJobById,
	cancelJob,
	submitReview,
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

// GET    /api/jobs/:id  — Single job by ID
router.get("/:id", protect, getJobById);

// PUT    /api/jobs/:jobId/cancel  — Customer cancels a pending job
router.put("/:jobId/cancel", protect, cancelJob);

// POST   /api/jobs/:jobId/review  — Customer rates the completed job
router.post("/:jobId/review", protect, submitReview);

module.exports = router;
