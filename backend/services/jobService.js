const { Job, User } = require("../models");

/**
 * Creates a new service request job in the database.
 * @param {object} jobData - Contains serviceType, location, notes, cost, etc.
 * @param {string} userId - The ID of the user creating the job.
 * @returns {object} The newly created job record.
 */
async function createJob(jobData, userId) {
	const { serviceType, pickupLatitude, pickupLongitude, estimatedCost, notes } = jobData;

	// Validate essential data
	if (!serviceType || !pickupLatitude || !pickupLongitude || !userId) {
		throw new Error("Missing required job data.");
	}

	// Format location for PostGIS (GeoJSON Point)
	const pickupLocation = {
		type: "Point",
		coordinates: [pickupLongitude, pickupLatitude], // [lon, lat]
	};

	const newJob = await Job.create({
		userId, // Associate the job with the logged-in user
		status: "pending", // Initial status
		serviceType,
		pickupLocation,
		estimatedCost: estimatedCost || null,
		notes: notes || null,
	});

	return newJob;
}
async function cancelJob(jobId, userId) {
	const job = await Job.findByPk(jobId);
	if (!job) {
		throw new Error("Job not found.");
	}
	// Security check: Only the user who created the job can cancel it.
	if (job.userId !== userId) {
		throw new Error("Forbidden");
	}
	// A user can only cancel a job if it's still pending.
	if (job.status !== "pending") {
		throw new Error("Cannot cancel a job that has already been accepted.");
	}
	job.status = "cancelled";
	await job.save();
	return job;
}

async function getJobById(jobId) {
	const job = await Job.findByPk(jobId, {
		// Include the User model to get the customer's name
		include: [
			{
				model: User,
				attributes: ["id", "name", "phoneNumber"],
			},
		],
	});
	return job;
}
async function completeJob(jobId, driverId) {
	const job = await Job.findByPk(jobId);
	if (!job) {
		throw new Error("Job not found.");
	}
	// Security check: Only the driver who accepted the job can complete it.
	if (job.driverId !== driverId) {
		throw new Error("Forbidden");
	}
	// A driver can only complete a job that is currently 'accepted'.
	if (job.status !== "accepted") {
		throw new Error("This job is not in an accepted state.");
	}
	job.status = "completed";
	await job.save();
	return job;
}

// We will add findNearestDriver logic back here later
module.exports = {
	createJob,
	cancelJob,
	completeJob,
	getJobById,
};
