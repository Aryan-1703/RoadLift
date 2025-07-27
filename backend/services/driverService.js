const { Job, User, sequelize, Driver } = require("../models");
const io = require("../socket");
const stripe = require("../config/stripe");
const paymentService = require("./paymentService");

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

/**
 * Allows a driver to accept a pending job. This function is transactional and
 * will also create a Stripe Payment Intent to authorize the charge on the customer's card.
 * @param {string} jobId - The ID of the job to accept.
 * @param {number} driverId - The ID of the driver accepting the job.
 * @returns {object} The updated job object.
 */
async function acceptJob(jobId, driverId) {
	const result = await sequelize.transaction(async t => {
		// Step 1: Find the job and eager-load the customer (User) who created it.
		// We lock the row for the duration of the transaction to prevent race conditions.
		const job = await Job.findByPk(jobId, {
			include: [User], // Eager-loading is more efficient than a separate query
			transaction: t,
			lock: t.LOCK.UPDATE,
		});

		// Step 2: Perform validations
		if (!job) {
			throw new Error("Job not found.");
		}
		if (job.status !== "pending") {
			throw new Error("Job is no longer available.");
		}

		const customer = job.User;
		if (!customer) {
			throw new Error("Could not find the associated customer for this job.");
		}

		// Step 3: --- NEW - Create the Stripe Payment Intent ---
		// This attempts to authorize the payment on the customer's default card.
		// If this fails (e.g., card declined), the entire transaction will roll back.
		console.log(`Attempting to create Payment Intent for job ${job.id}...`);
		const paymentIntent = await paymentService.createPaymentIntent(job, customer);
		console.log(`✅ Payment Intent ${paymentIntent.id} created successfully.`);

		// Step 4: Update our database record with the new state and Stripe info
		job.driverId = driverId;
		job.status = "accepted";
		job.paymentIntentId = paymentIntent.id; // Save the transaction ID
		job.paymentMethodId = paymentIntent.payment_method; // Save the card that was used
		await job.save({ transaction: t });

		// Step 5: Notify clients in real-time
		// a. Notify the customer that their request was accepted.
		io.to(String(job.userId)).emit("job-accepted", {
			jobId: job.id,
			message: "A driver has accepted your request and is on the way!",
			driverId: driverId,
		});

		// b. Notify all other drivers that this job is no longer available.
		io.to("drivers").emit("job-taken", {
			jobId: job.id,
		});

		console.log(`📢 Emitted real-time events for job ${job.id}.`);

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
		refresh_url: "https://roadlift.ca/stripe/refresh",
		return_url: "https://roadlift.ca/stripe/success",
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
};
