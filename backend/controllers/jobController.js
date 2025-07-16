const jobService = require("../services/jobService");
const io = require("../socket"); // 1. Import the shared socket instance

// @desc    Create a new service request
// @route   POST /api/jobs
// @access  Private (User)
const createJob = async (req, res) => {
	try {
		const newJob = await jobService.createJob(req.body, req.user.id);
		console.log(`Job ${newJob.id} created successfully.`);

		// --- REAL-TIME EMIT TO DRIVERS ---
		// 2. Use the imported 'io' instance directly
		// We get fresh job details with user info to send to the driver app
		const jobWithUserData = await jobService.getJobById(newJob.id);
		if (jobWithUserData) {
			io.to("drivers").emit("new-job", jobWithUserData);
			console.log(`✅ Emitted 'new-job' event to 'drivers' room for job ${newJob.id}.`);
		}

		res.status(201).json({
			message: "Job created successfully.",
			job: newJob,
		});
	} catch (error) {
		console.error("❌ Error in createJob controller:", error);
		res.status(500).json({ message: "Server error while creating job." });
	}
};

// @desc    Cancel a pending job
// @route   PUT /api/jobs/:jobId/cancel
// @access  Private (User who created it)
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

// @desc    Get details of a single job
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = async (req, res) => {
	try {
		const { id } = req.params;
		const job = await jobService.getJobById(id);
		if (!job) {
			return res.status(404).json({ message: "Job not found." });
		}
		res.status(200).json(job);
	} catch (error) {
		console.error("❌ Error fetching job by ID:", error);
		res.status(500).json({ message: "Server error." });
	}
};

module.exports = {
	createJob,
	cancelJob,
	getJobById,
};
