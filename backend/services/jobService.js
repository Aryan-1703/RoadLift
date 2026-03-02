const { Op }         = require("sequelize");
const { Job, User, DriverProfile, sequelize, Review, Vehicle } = require("../models");
const io             = require("../socket");
const { sendPushNotification } = require("../utils/sendPushNotification");

const SERVICE_TYPE_MAP = {
	TOWING:           "towing",
	towing:           "towing",
	TIRE:             "tire-change",
	tire:             "tire-change",
	"tire-change":    "tire-change",
	"TIRE-CHANGE":    "tire-change",
	LOCKOUT:          "car-lockout",
	lockout:          "car-lockout",
	"car-lockout":    "car-lockout",
	"CAR-LOCKOUT":    "car-lockout",
	FUEL:             "fuel-delivery",
	fuel:             "fuel-delivery",
	"fuel-delivery":  "fuel-delivery",
	"FUEL-DELIVERY":  "fuel-delivery",
	ACCIDENT:         "towing",
	accident:         "towing",
	BATTERY:          "battery-boost",
	battery:          "battery-boost",
	"battery-boost":  "battery-boost",
	"BATTERY-BOOST":  "battery-boost",
};

// ─────────────────────────────────────────────────────────────────────────────
// Create a new job
// ─────────────────────────────────────────────────────────────────────────────
async function createJob(jobData, userId) {
	let { serviceType, pickupLatitude, pickupLongitude, estimatedCost, notes } = jobData;

	if (!serviceType || !pickupLatitude || !pickupLongitude || !userId) {
		throw new Error("Missing required job data.");
	}

	serviceType =
		SERVICE_TYPE_MAP[serviceType] ||
		SERVICE_TYPE_MAP[serviceType?.toUpperCase()] ||
		"towing";

	const pickupLocation = {
		type:        "Point",
		coordinates: [pickupLongitude, pickupLatitude],
	};

	const newJob = await Job.create({
		userId,
		status: "pending",
		serviceType,
		pickupLocation,
		estimatedCost: estimatedCost || null,
		notes:         notes || null,
	});

	// Post-creation: broadcast + push notifications (non-blocking)
	try {
		const jobWithData = await getJobById(newJob.id);
		io.to("drivers").emit("new-job", jobWithData);

		// Notify online drivers with push tokens
		const drivers = await User.findAll({
			where: {
				role:      "DRIVER",
				isActive:  true,
				pushToken: { [Op.ne]: null },
			},
		});
		for (const driver of drivers) {
			await sendPushNotification(driver.pushToken, jobWithData);
		}
	} catch (err) {
		console.error("⚠️ Post-job broadcast failed (non-fatal):", err.message);
	}

	return newJob;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel a pending job (customer only)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelJob(jobId, userId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.userId !== userId) throw new Error("Forbidden");
	if (job.status !== "pending") {
		throw new Error("Cannot cancel a job that has already been accepted.");
	}
	job.status = "cancelled";
	await job.save();
	return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get a single job with customer + driver info
// ─────────────────────────────────────────────────────────────────────────────
async function getJobById(jobId) {
	return Job.findByPk(jobId, {
		include: [
			{
				model: User,
				as:    "customer",
				attributes: ["id", "name", "phoneNumber"],
			},
			{
				model: User,
				as:    "driver",
				attributes: ["id", "name", "phoneNumber"],
				required: false,
			},
			{
				model: Vehicle,
				required: false,
			},
		],
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit or update a review for a completed job
// ─────────────────────────────────────────────────────────────────────────────
async function submitReview(jobId, reviewData, author) {
	const { rating, comment } = reviewData;
	const { id: authorId, role: authorRole } = author;

	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.userId !== authorId && job.driverId !== authorId) {
		throw new Error("Forbidden");
	}

	const existingReview = await Review.findOne({ where: { jobId } });
	if (existingReview) {
		if (authorRole === "DRIVER") {
			existingReview.userRating = rating;
		} else {
			existingReview.driverRating = rating;
		}
		existingReview.comment = existingReview.comment
			? `${existingReview.comment}\n\n${comment}`
			: comment;
		await existingReview.save();
		return existingReview;
	}

	return Review.create({
		jobId,
		userId:      job.userId,
		driverId:    job.driverId,
		driverRating: authorRole === "CUSTOMER" ? rating : null,
		userRating:   authorRole === "DRIVER"   ? rating : null,
		comment,
		authorRole,
	});
}

module.exports = {
	createJob,
	cancelJob,
	getJobById,
	submitReview,
};
