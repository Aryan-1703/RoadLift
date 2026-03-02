const { Job, User, DriverProfile, sequelize } = require("../models");
const io             = require("../socket");
const stripe         = require("../config/stripe");
const paymentService = require("./paymentService");
const { Op }         = require("sequelize");
const { sendPushNotification } = require("../utils/sendPushNotification");

// ─────────────────────────────────────────────────────────────────────────────
// Available jobs for a driver
// ─────────────────────────────────────────────────────────────────────────────
async function getAvailableJobs() {
	return Job.findAll({
		where: { status: "pending" },
		include: [
			{
				model: User,
				as: "customer",
				attributes: ["id", "name", "phoneNumber"],
			},
		],
		order: [["createdAt", "DESC"]],
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept job — creates Payment Intent and notifies via socket
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
			const paymentIntent = await paymentService.createPaymentIntent(job, customer);
			job.paymentIntentId = paymentIntent.id;
			job.paymentMethodId = paymentIntent.payment_method;
		}

		job.driverId = driverId;
		job.status   = "accepted";
		await job.save({ transaction: t });

		io.to(String(job.userId)).emit("job-accepted", {
			jobId:   job.id,
			message: "A driver has accepted your request and is on the way!",
			driverId,
		});
		io.to("drivers").emit("job-taken", { jobId: job.id });

		return job;
	});

	return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete job
// ─────────────────────────────────────────────────────────────────────────────
async function completeJob(jobId, driverId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.driverId !== driverId) throw new Error("Forbidden");
	if (job.status !== "accepted") throw new Error("This job is not in an accepted state.");

	job.status = "completed";
	await job.save();

	io.to(String(job.userId)).emit("job-completed", {
		jobId:   job.id,
		message: "Your service is complete!",
	});

	return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Connect onboarding
// ─────────────────────────────────────────────────────────────────────────────
async function createStripeOnboardingLink(driverId) {
	const driver = await User.findByPk(driverId);
	if (!driver || driver.role !== "DRIVER") throw new Error("Driver not found.");

	let accountId = driver.stripeAccountId;

	if (!accountId) {
		const [firstName, ...rest] = driver.name.split(" ");
		const account = await stripe.accounts.create({
			type:          "express",
			email:         driver.email,
			business_type: "individual",
			individual: {
				first_name: firstName,
				last_name:  rest.join(" "),
				phone:      driver.phoneNumber,
			},
		});
		accountId = account.id;
		await User.update(
			{ stripeAccountId: accountId },
			{ where: { id: driverId } },
		);
	}

	const accountLink = await stripe.accountLinks.create({
		account:     accountId,
		refresh_url: "https://roadlift.ca/stripe/refresh",
		return_url:  "https://roadlift.ca/stripe/success",
		type:        "account_onboarding",
	});

	return { url: accountLink.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// Notify available drivers of a new job via push
// (called from jobService.createJob)
// ─────────────────────────────────────────────────────────────────────────────
async function notifyAvailableDrivers(job) {
	const drivers = await User.findAll({
		where: {
			role:      "DRIVER",
			isActive:  true,
			pushToken: { [Op.ne]: null },
		},
	});

	for (const driver of drivers) {
		await sendPushNotification(driver.pushToken, job);
	}
}

module.exports = {
	getAvailableJobs,
	acceptJob,
	completeJob,
	createStripeOnboardingLink,
	notifyAvailableDrivers,
};
