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

module.exports = { getAvailableJobs };
