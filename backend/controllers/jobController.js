const jobService = require("../services/jobService");

// @desc    Create a new service request
// @route   POST /api/jobs
// @access  Private (User must be logged in)
const createJob = async (req, res) => {
	try {
		const newJob = await jobService.createJob(req.body, req.user.id);
		console.log(`Job ${newJob.id} created successfully. Searching for drivers...`);

		// Emit real-time job to all drivers in "drivers" socket room
		const io = req.app.get("io");
		if (io) {
			io.to("drivers").emit("new-job", {
				jobId: newJob.id,
				serviceType: newJob.serviceType,
				pickupLocation: newJob.pickupLocation,
				estimatedCost: newJob.estimatedCost,
				notes: newJob.notes,
				createdAt: newJob.createdAt,
			});
			console.log(`✅ Emitted 'new-job' event to 'drivers' room.`);
		} else {
			console.warn("⚠️ Socket IO instance not found on req.app");
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

const cancelJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const userId = req.user.id;

		await jobService.cancelJob(jobId, userId);

		res.status(200).json({ message: "Job successfully cancelled." });
	} catch (error) {
		if (error.message === "Forbidden") {
			return res.status(403).json({
				message: "You are not authorized to cancel this job.",
			});
		}
		if (error.message.includes("already been accepted")) {
			return res.status(409).json({ message: error.message });
		}
		console.error("❌ Error in cancelJob controller:", error);
		res.status(500).json({ message: "Server error while cancelling job." });
	}
};

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
