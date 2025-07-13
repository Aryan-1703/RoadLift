const driverService = require("../services/driverService");

const getAvailableJobs = async (req, res) => {
	try {
		const jobs = await driverService.getAvailableJobs();
		res.status(200).json(jobs);
	} catch (error) {
		console.error("Error fetching available jobs:", error);
		res.status(500).json({ message: "Server error." });
	}
};

const acceptJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id; // From our 'protect' middleware

		const updatedJob = await driverService.acceptJob(jobId, driverId);
		res.status(200).json(updatedJob);
	} catch (error) {
		console.error("Error accepting job:", error.message);
		// Send a 409 Conflict if the job was already taken
		if (error.message.includes("longer available")) {
			return res.status(409).json({ message: error.message });
		}
		res.status(500).json({ message: "Server error while accepting job." });
	}
};

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

module.exports = { getAvailableJobs, acceptJob, completeJob };
