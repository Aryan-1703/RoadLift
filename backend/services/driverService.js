const { Job, User, sequelize, Driver } = require("../models");
const io = require("../socket");
const stripe = require("../config/stripe");

async function getAvailableJobs() {
	// Find all jobs that are pending and include the name of the user who requested it.
	const jobs = await Job.findAll({
		where: { status: "pending" },
		include: [
			{
				model: User,
				attributes: ["name"], // Only include the user's name for privacy
			},
		],
		order: [["createdAt", "DESC"]], // Show newest jobs first
	});
	return jobs;
}

async function acceptJob(jobId, driverId) {
	const result = await sequelize.transaction(async t => {
		const job = await Job.findByPk(jobId, { transaction: t, lock: t.LOCK.UPDATE });

		if (!job) throw new Error("Job not found.");
		if (job.status !== "pending") throw new Error("Job is no longer available.");

		job.driverId = driverId;
		job.status = "accepted";
		await job.save({ transaction: t });

		// 1. Notify the specific customer who created the job.
		io.to(String(job.userId)).emit("job-accepted", {
			jobId: job.id,
			message: "A driver has accepted your request!",
			driverId: driverId, // Send the driver's ID too
		});

		// 2. Notify ALL other connected drivers that this job is now taken.
		io.to("drivers").emit("job-taken", {
			jobId: job.id,
		});

		return job;
	});

	return result;
}

async function updateStatus(driverId, isActive) {
	const driver = await Driver.findByPk(driverId);
	if (!driver) {
		console.error("Driver not found for ID:", driverId);
		throw new Error("Driver not found.");
	}
	driver.isActive = isActive;
	await driver.save();
	return driver;
}

async function completeJob(jobId, driverId) {
	const job = await Job.findByPk(jobId);
	if (!job) throw new Error("Job not found.");
	if (job.driverId !== driverId) throw new Error("Forbidden");
	if (job.status !== "accepted") throw new Error("This job is not in an accepted state.");

	job.status = "completed";
	await job.save();

	// --- THIS IS THE NEW PART ---
	// Notify the customer that the job is officially complete.
	io.to(String(job.userId)).emit("job-completed", {
		jobId: job.id,
		message: "Your service is complete!",
	});
	console.log(`✅ Emitted 'job-completed' event to customer room: ${job.userId}`);
	// ---

	return job;
}

async function createStripeOnboardingLink(driverId) {
	const driver = await Driver.findByPk(driverId);
	if (!driver) throw new Error("Driver not found.");

	let accountId = driver.stripeAccountId;

	// 1. Create a new Stripe Connected Account if the driver doesn't have one yet
	if (!accountId) {
		const account = await stripe.accounts.create({
			type: "express", // 'express' is the easiest for marketplaces
			email: driver.email, // Assuming you add an email field to your Driver model
			business_type: "individual",
			// You can pre-fill information you already have
			individual: {
				first_name: driver.name.split(" ")[0],
				last_name: driver.name.split(" ").slice(1).join(" "),
				phone: driver.phoneNumber,
			},
		});
		accountId = account.id;
		// Save the new accountId to our database
		driver.stripeAccountId = accountId;
		await driver.save();
	}

	// 2. Create the one-time onboarding link for the account
	const accountLink = await stripe.accountLinks.create({
		account: accountId,
		refresh_url: "towlink://onboarding-failed",
		return_url: "towlink://onboarding-success",
		type: "account_onboarding",
	});

	return { url: accountLink.url };
}
module.exports = {
	getAvailableJobs,
	acceptJob,
	updateStatus,
	completeJob,
	createStripeOnboardingLink,
	accountLink,
};
