// towlink-backend/controllers/jobController.js
const jobService = require("../services/jobService");

// @desc    Create a new service request
// @route   POST /api/jobs
// @access  Private (User must be logged in)
const createJob = async (req, res) => {
	try {
		// req.user.id is attached by our 'protect' middleware
		const newJob = await jobService.createJob(req.body, req.user.id);

		// In the future, this is where we'll trigger the real-time search for drivers
		console.log(`Job ${newJob.id} created successfully. Searching for drivers...`);

		res.status(201).json({
			message: "Job created successfully.",
			job: newJob,
		});
	} catch (error) {
		console.error("Error in createJob controller:", error);
		res.status(500).json({ message: "Server error while creating job." });
	}
};
const cancelJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const userId = req.user.id;
		await jobService.cancelJob(jobId, userId);
		res.status(200).json({ message: "Job successfully cancelled." });
	} catch (error) {
		if (error.message === "Forbidden") {
			return res
				.status(403)
				.json({ message: "You are not authorized to cancel this job." });
		}
		if (error.message.includes("already been accepted")) {
			return res.status(409).json({ message: error.message });
		}
		res.status(500).json({ message: "Server error while cancelling job." });
	}
};

const getJobById = async (req, res) => {
	try {
		const { id } = req.params; // The job ID from the URL
		const job = await jobService.getJobById(id);

		if (!job) {
			return res.status(404).json({ message: "Job not found." });
		}

		// Future security check: You could add logic here to ensure only the
		// customer who created it or the driver assigned to it can view it.
		// For V1, any authenticated user can view it for simplicity.

		res.status(200).json(job);
	} catch (error) {
		console.error("Error fetching job by ID:", error);
		res.status(500).json({ message: "Server error." });
	}
};

module.exports = {
	createJob,
	cancelJob,
	getJobById,
};
