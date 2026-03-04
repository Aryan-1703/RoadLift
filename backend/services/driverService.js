const { Job, User, DriverProfile, sequelize } = require("../models");
const io = require("../socket");
const stripe = require("../config/stripe");
const paymentService = require("./paymentService");
const { Op } = require("sequelize");
const { sendPushNotification } = require("../utils/sendPushNotification");

// ─────────────────────────────────────────────────────────────────────────────
// normalizeJob — inlined to avoid any circular-dependency / import issues.
// Converts a raw Sequelize Job (PostGIS geometry) into the shape the frontend
// expects: flat lat/lng, human-readable address, parsed prices, customer info.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeJob(job) {
	const raw = job.toJSON ? job.toJSON() : job;

	const pickupCoords = raw.pickupLocation?.coordinates; // [lng, lat]
	const dropoffCoords = raw.dropoffLocation?.coordinates;

	return {
		id: String(raw.id),
		serviceType: raw.serviceType,
		status: raw.status,
		notes: raw.notes ?? null,
		pickupAddress: raw.pickupAddress ?? null,

		customerLocation: pickupCoords
			? {
					latitude: pickupCoords[1],
					longitude: pickupCoords[0],
					address: raw.pickupAddress ?? null,
				}
			: null,

		dropoffLocation: dropoffCoords
			? {
					latitude: dropoffCoords[1],
					longitude: dropoffCoords[0],
				}
			: null,

		estimatedPrice: raw.estimatedCost != null ? parseFloat(raw.estimatedCost) : null,
		finalPrice: raw.finalCost != null ? parseFloat(raw.finalCost) : null,

		customerId: raw.userId ?? null,
		driverId: raw.driverId ?? null,
		customerName: raw.customer?.name ?? null,
		customerPhone: raw.customer?.phoneNumber ?? null,
		driverName: raw.driver?.name ?? null,
		driverPhone: raw.driver?.phoneNumber ?? null,

		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard JOIN reused by getAvailableJobs + acceptJob
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOMER_INCLUDE = {
	model: User,
	as: "customer",
	attributes: ["id", "name", "phoneNumber"],
};

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableJobs
// ─────────────────────────────────────────────────────────────────────────────
async function getAvailableJobs() {
	const jobs = await Job.findAll({
		where: { status: "pending" },
		include: [CUSTOMER_INCLUDE],
		order: [["createdAt", "DESC"]],
	});
	return jobs.map(normalizeJob);
}

// ─────────────────────────────────────────────────────────────────────────────
// acceptJob
// ─────────────────────────────────────────────────────────────────────────────
async function acceptJob(jobId, driverId) {
	const result = await sequelize.transaction(async t => {
		const job = await Job.findByPk(jobId, {
			include: [{ model: User, as: "customer", required: true }],
			transaction: t,
			lock: t.LOCK.UPDATE,
		});

		if (!job) throw new Error("Job not found.");
		if (job.status !== "pending") throw new Error("Job is no longer available.");

		const customer = job.customer;
		if (!customer) throw new Error("Could not find customer for this job.");

		if (!job.paymentIntentId) {
			try {
				const paymentIntent = await paymentService.createPaymentIntentForJob(
					job,
					customer,
				);
				job.paymentIntentId = paymentIntent.id;
				job.paymentMethodId = paymentIntent.payment_method;
			} catch (payErr) {
				console.warn(
					"[driverService] Failed to pre-create payment intent:",
					payErr.message,
				);
			}
		}

		job.driverId = driverId;
		job.status = "accepted";
		await job.save({ transaction: t });

		io.to(String(job.userId)).emit("job-accepted", {
			jobId: job.id,
			message: "A driver has accepted your request and is on the way!",
			driverId,
		});
		io.to("drivers").emit("job-taken", { jobId: job.id });

		return job;
	});

	// Re-fetch with customer JOIN so normalizeJob has name/phone
	const jobWithCustomer = await Job.findByPk(result.id, {
		include: [CUSTOMER_INCLUDE],
	});
	return normalizeJob(jobWithCustomer);
}

// ─────────────────────────────────────────────────────────────────────────────
// completeJob
// ─────────────────────────────────────────────────────────────────────────────
async function completeJob(jobId, driverId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.driverId !== driverId) throw new Error("Forbidden");
	if (!["accepted", "in_progress", "arrived"].includes(job.status)) {
		throw new Error("This job cannot be completed in its current state.");
	}

	job.status = "completed";
	await job.save();

	io.to(String(job.userId)).emit("job-completed", {
		jobId: job.id,
		message: "Your service is complete!",
	});

	const jobWithCustomer = await Job.findByPk(job.id, { include: [CUSTOMER_INCLUDE] });
	return normalizeJob(jobWithCustomer);
}

// ─────────────────────────────────────────────────────────────────────────────
// createStripeOnboardingLink
// ─────────────────────────────────────────────────────────────────────────────
async function createStripeOnboardingLink(driverId) {
	const driver = await User.findByPk(driverId);
	if (!driver || driver.role !== "DRIVER") throw new Error("Driver not found.");

	let accountId = driver.stripeAccountId;

	if (!accountId) {
		const [firstName, ...rest] = driver.name.split(" ");
		const account = await stripe.accounts.create({
			type: "express",
			email: driver.email,
			business_type: "individual",
			individual: {
				first_name: firstName,
				last_name: rest.join(" "),
				phone: driver.phoneNumber,
			},
		});
		accountId = account.id;
		await User.update({ stripeAccountId: accountId }, { where: { id: driverId } });
	}

	const accountLink = await stripe.accountLinks.create({
		account: accountId,
		refresh_url: "https://roadlift.ca/stripe/refresh",
		return_url: "https://roadlift.ca/stripe/success",
		type: "account_onboarding",
	});

	return { url: accountLink.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyAvailableDrivers  (called from jobService via lazy require)
// ─────────────────────────────────────────────────────────────────────────────
async function notifyAvailableDrivers(job) {
	const drivers = await User.findAll({
		where: {
			role: "DRIVER",
			isActive: true,
			pushToken: { [Op.ne]: null },
		},
	});
	for (const driver of drivers) {
		await sendPushNotification(driver.pushToken, job).catch(() => {});
	}
}

module.exports = {
	normalizeJob,
	getAvailableJobs,
	acceptJob,
	completeJob,
	createStripeOnboardingLink,
	notifyAvailableDrivers,
};
