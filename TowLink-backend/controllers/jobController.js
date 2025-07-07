const jobService = require("../services/jobService");

const createJob = async (req, res) => {
	try {
		const result = await jobService.createJobAndFindDriver(req.body.customerLocation);

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
		// Differentiate between user error and server error
		if (error.message === "Latitude and Longitude are required.") {
			return res.status(400).send(error.message);
		}
		res.status(500).send("Server Error");
	}
};

module.exports = {
	createJob,
};
