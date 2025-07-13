const { Job } = require("../models");

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

// We will add findNearestDriver logic back here later
module.exports = {
	createJob,
};
