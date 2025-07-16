const driverService = require("../services/driverService");

// @desc    Get all available (pending) jobs
// @route   GET /api/driver/jobs/available
// @access  Private (Driver)
const getAvailableJobs = async (req, res) => {
	try {
		const jobs = await driverService.getAvailableJobs();
		res.status(200).json(jobs);
	} catch (error) {
		console.error("Error fetching available jobs:", error);
		res.status(500).json({ message: "Server error." });
	}
};

// @desc    Accept a pending job
// @route   PUT /api/driver/jobs/:jobId/accept
// @access  Private (Driver)
const acceptJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		// The service handles the 'io' instance internally
		const updatedJob = await driverService.acceptJob(jobId, driverId);
		res.status(200).json(updatedJob);
	} catch (error) {
		console.error("Error accepting job:", error.message);
		if (error.message.includes("longer available")) {
			return res.status(409).json({ message: error.message });
		}
		res.status(500).json({ message: "Server error while accepting job." });
	}
};

// @desc    Mark an accepted job as complete
// @route   PUT /api/driver/jobs/:jobId/complete
// @access  Private (Driver who accepted it)
const completeJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		const updatedJob = await driverService.completeJob(jobId, driverId);
		res.status(200).json(updatedJob);
	} catch (error) {
		if (error.message === "Forbidden") {
			return res
				.status(403)
				.json({ message: "You are not authorized to complete this job." });
		}
		res.status(500).json({ message: "Server error while completing job." });
	}
};

module.exports = {
	getAvailableJobs,
	acceptJob,
	completeJob,
};
