
const jobService = require("../services/jobService");

const createJob = async (req, res) => {
	try {
		// The user object is still attached by our 'protect' middleware
		const userId = req.user.id;

		// The ONLY change is here. We now pass the entire req.body
		// to the service, instead of just a piece of it.
		const result = await jobService.createJobAndFindDriver(req.body, userId);

		// The rest of this logic remains the same, as the service
		// still returns the same result structure.
		if (result.assignedDriver) {
			res.status(201).json({
				message: "Job created and nearest driver found.",
				job: result.job,
				assignedDriver: result.assignedDriver,
			});
		} else {
			res.status(201).json({
				message: "Job created, but no active drivers are currently available.",
				job: result.job,
				assignedDriver: null,
			});
		}
	} catch (error) {
		console.error("Error in jobController:", error);
		// Update the error check to be more generic for validation errors from the service.
		if (error.message.includes("required")) {
			return res.status(400).send({ message: error.message });
		}
		res.status(500).send({ message: "Server Error" });
	}
};

module.exports = {
	createJob,
};
