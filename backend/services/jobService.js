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
		vehicleId,
		paymentIntentId: preAuthorizedIntentId, // set when Apple Pay pre-auth already done
		isThirdParty,
		recipientName,
		recipientPhone,
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
		pickupAddress:  pickupAddress  || null,
		estimatedCost:  estimatedCost  || null,
		notes:          notes          || null,
		vehicleId:      vehicleId      || null,
		isThirdParty:   isThirdParty   ?? false,
		recipientName:  isThirdParty ? (recipientName  || null) : null,
		recipientPhone: isThirdParty ? (recipientPhone || null) : null,
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

// Flat cancellation fee charged when a customer cancels after driver is assigned
const CUSTOMER_CANCEL_FEE_CENTS = 500; // $5.00

// ─────────────────────────────────────────────────────────────────────────────
// cancelJob  (customer-initiated)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelJob(jobId, userId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.userId !== userId) throw new Error("Forbidden");

	if (job.status === "in_progress") {
		throw new Error("Cannot cancel a job that is already in progress.");
	}
	if (!["pending", "accepted", "arrived"].includes(job.status)) {
		throw new Error("This job cannot be cancelled.");
	}

	let cancellationFee = 0;

	if (job.status === "pending") {
		// Free cancellation — stop dispatch and void the hold
		const { stopDispatch } = require("./dispatchService");
		stopDispatch(job.id);
		if (job.paymentIntentId) {
			await paymentService.cancelAuthorization(job.paymentIntentId).catch(err =>
				console.warn("[jobService] Could not cancel authorization:", err.message),
			);
		}
	} else {
		// Late cancellation (accepted / arrived) — charge $5 fee
		if (job.paymentIntentId) {
			try {
				await paymentService.capturePartialAndCancel(job.paymentIntentId, CUSTOMER_CANCEL_FEE_CENTS);
				cancellationFee = CUSTOMER_CANCEL_FEE_CENTS / 100;
			} catch (err) {
				console.warn("[jobService] Could not charge cancellation fee:", err.message);
				// Still release the full hold so customer isn't left charged
				await paymentService.cancelAuthorization(job.paymentIntentId).catch(() => {});
			}
		}
	}

	const driverId = job.driverId;
	job.status = "cancelled";
	if (cancellationFee > 0) job.finalCost = cancellationFee;
	await job.save();

	return { job, cancellationFee, driverId };
}

// ─────────────────────────────────────────────────────────────────────────────
// driverCancelJob  (driver-initiated)
// Re-dispatches the job so the customer is matched with another driver.
// ─────────────────────────────────────────────────────────────────────────────
async function driverCancelJob(jobId, driverId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (Number(job.driverId) !== Number(driverId)) throw new Error("Forbidden");

	if (!["accepted", "arrived"].includes(job.status)) {
		throw new Error("Cannot cancel this job in its current state.");
	}

	const customerId = job.userId;

	// Reset job so it can be re-dispatched
	job.driverId = null;
	job.status   = "pending";
	await job.save();

	// Re-start the dispatch search, but exclude the driver who just cancelled
	// so they never receive the same job again.
	const { startDispatch } = require("./dispatchService");
	const lat = job.pickupLocation?.coordinates?.[1];
	const lng = job.pickupLocation?.coordinates?.[0];
	if (lat && lng) {
		startDispatch(job, lat, lng, { excludeDriverId: driverId }).catch(err =>
			console.error("[jobService] Re-dispatch after driver cancel failed:", err.message),
		);
	}

	return { job, customerId };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateJobStatus  (ARRIVED only — IN_PROGRESS is now auto-skipped)
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

// ─────────────────────────────────────────────────────────────────────────────
// customerCompleteJob  (customer-initiated completion)
// Delegates to driverService.completeJob with triggeredByCustomer flag
// so the driver receives a job-completed-notice socket event.
// ─────────────────────────────────────────────────────────────────────────────
async function customerCompleteJob(jobId, userId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (Number(job.userId) !== Number(userId)) throw new Error("Forbidden");
	if (!["accepted", "arrived", "in_progress"].includes(job.status)) {
		throw new Error("This job cannot be completed in its current state.");
	}
	if (!job.driverId) throw new Error("No driver assigned to this job.");
	// Reuse the full payment-capture + transfer + emit logic from driverService
	const { completeJob } = require("./driverService");
	return completeJob(jobId, job.driverId, { triggeredByCustomer: true });
}

module.exports = {
	createJob,
	customerCompleteJob,
	getJobById,
	cancelJob,
	driverCancelJob,
	updateJobStatus,
	submitReview,
};
