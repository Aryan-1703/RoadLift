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

module.exports = {
	createJob,
};
