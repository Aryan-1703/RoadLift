const { Job, User, Review, sequelize } = require("../models");
const paymentService = require("./paymentService");

// normalizeJob lives in driverService (inlined there to avoid circular deps).
// jobService imports it lazily inside each function — DO NOT top-level require
// driverService here or you recreate the circular dependency.
function getNormalize() {
	return require("./driverService").normalizeJob;
}

// ─────────────────────────────────────────────────────────────────────────────
// createJob
// ─────────────────────────────────────────────────────────────────────────────
async function createJob(body, userId) {
	const {
		serviceType,
		pickupLatitude,
		pickupLongitude,
		pickupAddress,
		dropoffLatitude,
		dropoffLongitude,
		estimatedCost,
		notes,
		paymentIntentId: preAuthorizedIntentId, // set when Apple Pay pre-auth already done
	} = body;

	if (!serviceType) throw new Error("serviceType is required.");
	if (!pickupLatitude) throw new Error("pickupLatitude is required.");
	if (!pickupLongitude) throw new Error("pickupLongitude is required.");

	const customer = await User.findByPk(userId);
	if (!customer) throw new Error("User not found.");

	const pickupLocation = {
		type: "Point",
		coordinates: [parseFloat(pickupLongitude), parseFloat(pickupLatitude)],
	};

	const dropoffLocation =
		dropoffLatitude && dropoffLongitude
			? {
					type: "Point",
					coordinates: [parseFloat(dropoffLongitude), parseFloat(dropoffLatitude)],
				}
			: null;

	const job = await Job.create({
		serviceType,
		userId,
		pickupLocation,
		...(dropoffLocation ? { dropoffLocation } : {}),
		pickupAddress: pickupAddress || null,
		estimatedCost: estimatedCost || null,
		notes: notes || null,
		status: "pending",
	});

	if (preAuthorizedIntentId) {
		// Apple Pay: hold already placed, just associate the PI with the job
		job.paymentIntentId = preAuthorizedIntentId;
		await job.save();
	} else {
		// Saved card: place a hold off-session — no hold, no dispatch
		try {
			const paymentIntent = await paymentService.authorizePayment(job, customer);
			job.paymentIntentId = paymentIntent.id;
			await job.save();
		} catch (payErr) {
			job.status = "cancelled";
			await job.save();
			const err = new Error(payErr.message || "Payment authorization failed.");
			err.isPaymentError = true;
			err.stripeCode = payErr.code ?? null;
			throw err;
		}
	}

	const { startDispatch } = require("./dispatchService");
	startDispatch(job, parseFloat(pickupLatitude), parseFloat(pickupLongitude)).catch(err =>
		console.error("[jobService] Dispatch failed to start:", err.message),
	);

	return getNormalize()(job);
}

// ─────────────────────────────────────────────────────────────────────────────
// getJobById
// ─────────────────────────────────────────────────────────────────────────────
async function getJobById(id) {
	const job = await Job.findByPk(id, {
		include: [
			{ model: User, as: "customer", attributes: ["id", "name", "phoneNumber"] },
			{ model: User, as: "driver", attributes: ["id", "name", "phoneNumber"] },
		],
	});
	if (!job) return null;
	return getNormalize()(job);
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelJob
// ─────────────────────────────────────────────────────────────────────────────
async function cancelJob(jobId, userId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.userId !== userId) throw new Error("Forbidden");
	if (["accepted", "in_progress"].includes(job.status)) {
		throw new Error("This job has already been accepted by a driver.");
	}
	// Release the payment hold
	if (job.paymentIntentId) {
		await paymentService.cancelAuthorization(job.paymentIntentId);
	}
	job.status = "cancelled";
	await job.save();
	return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// updateJobStatus  (ARRIVED / IN_PROGRESS)
// ─────────────────────────────────────────────────────────────────────────────
async function updateJobStatus(jobId, driverId, status) {
	const normalized = status.toLowerCase();
	if (!["arrived", "in_progress"].includes(normalized)) {
		throw new Error(`Invalid status transition: ${status}`);
	}
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.driverId !== driverId) throw new Error("Forbidden");

	job.status = normalized;
	await job.save();
	return getNormalize()(job);
}

// ─────────────────────────────────────────────────────────────────────────────
// submitReview
// ─────────────────────────────────────────────────────────────────────────────
async function submitReview(jobId, reviewData, author) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");

	const isCustomer = author.role === "CUSTOMER" && job.userId === author.id;
	const isDriver = author.role === "DRIVER" && job.driverId === author.id;
	if (!isCustomer && !isDriver) throw new Error("Forbidden");

	const review = await Review.create({
		jobId: job.id,
		authorRole: isCustomer ? "user" : "driver",
		driverRating: isCustomer ? reviewData.rating : null,
		userRating: isDriver ? reviewData.rating : null,
		comment: reviewData.comment ?? null,
		userId: job.userId,
		driverId: job.driverId,
	});

	return review;
}

module.exports = {
	createJob,
	getJobById,
	cancelJob,
	updateJobStatus,
	submitReview,
};
