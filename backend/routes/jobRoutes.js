const express = require("express");
const router = express.Router();
const { createJob, getJobById, cancelJob } = require("../controllers/jobController");
const { protect } = require("../middleware/authMiddleware");

// it passes control to the 'createJob' controller.
router.post("/", protect, createJob);
router.put("/:jobId/cancel", protect, cancelJob);
router.get("/:id", protect, getJobById);

router.get("/:id", protect, async (req, res) => {
	const job = await Job.findByPk(req.params.id, { include: User });
	if (job) {
		res.json(job);
	} else {
		res.status(404).json({ message: "Job not found" });
	}
});

module.exports = router;
