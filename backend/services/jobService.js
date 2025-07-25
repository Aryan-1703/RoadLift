const { Op } = require("sequelize");
const { Job, User, Driver, sequelize, Review } = require("../models");
const io = require("../socket");
const { sendPushNotification } = require("../utils/sendPushNotification");
/**
 * Creates a new service request job in the database.
 * @param {object} jobData - Contains serviceType, location, notes, cost, etc.
 * @param {string} userId - The ID of the user creating the job.
 * @returns {object} The newly created job record.
 */
async function createJob(jobData, userId) {
	// 1. Create the job in the database
	const { serviceType, pickupLatitude, pickupLongitude, estimatedCost, notes } = jobData;
	if (!serviceType || !pickupLatitude || !pickupLongitude || !userId) {
		throw new Error("Missing required job data.");
	}
	const pickupLocation = {
		type: "Point",
		coordinates: [pickupLongitude, pickupLatitude],
	};
	const newJob = await Job.create({
		userId,
		status: "pending",
		serviceType,
		pickupLocation,
		estimatedCost: estimatedCost || null,
		notes: notes || null,
	});

	// 2. Handle all real-time notifications and broadcasts
	try {
		const jobWithUserData = await getJobById(newJob.id);
		// Find drivers who have opted-in for push notifications

		io.to("drivers").emit("new-job", jobWithUserData);
		const driversToNotify = await Driver.findAll({
			where: {
				pushToken: { [Op.ne]: null },
				isActive: true,
			},
		});
		// Send push notifications to drivers who may have the app in the background
		console.log(`📲 Found ${driversToNotify.length} drivers with push tokens to notify.`);
		for (const driver of driversToNotify) {
			await sendPushNotification(driver.pushToken, jobWithUserData);
		}
	} catch (error) {
		// Log the error but don't let it crash the job creation process
		console.error(
			"⚠️ Error during post-job-creation broadcast/notification:",
			error.message
		);
	}

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
		include: [
			{
				model: User, // Customer details
				attributes: ["id", "name", "phoneNumber"],
			},
			{
				model: Driver, // --- NEW: Driver details ---
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

async function submitReview(jobId, reviewData, author) {
	const { rating, comment } = reviewData;
	const { id: authorId, role: authorRole } = author;

	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");

	// Security check: Only the customer or the assigned driver can review this job.
	if (job.userId !== authorId && job.driverId !== authorId) {
		throw new Error("Forbidden");
	}

	// Check if a review already exists for this job
	const existingReview = await Review.findOne({ where: { jobId } });
	if (existingReview) {
		// Update the existing review (e.g., driver adds their rating after the user)
		if (authorRole === "driver") {
			existingReview.userRating = rating;
		} else {
			existingReview.driverRating = rating;
		}
		existingReview.comment = existingReview.comment
			? `${existingReview.comment}\n\n${comment}`
			: comment; // Append comments or handle as needed
		await existingReview.save();
		return existingReview;
	} else {
		// Create a new review
		const newReview = await Review.create({
			jobId,
			userId: job.userId,
			driverId: job.driverId,
			driverRating: authorRole === "user" ? rating : null,
			userRating: authorRole === "driver" ? rating : null,
			comment,
			authorRole,
		});
		return newReview;
	}
}

module.exports = {
	createJob,
	cancelJob,
	completeJob,
	getJobById,
	submitReview,
};
