const { Job, User, DriverProfile, Vehicle, sequelize } = require("../models");
const io = require("../socket");
const stripe = require("../config/stripe");
const paymentService = require("./paymentService");
const { Op } = require("sequelize");
const { sendPushNotification } = require("../utils/sendPushNotification");
const driverLocationStore = require("./driverLocationStore");

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
		currentPrice:   raw.currentPrice  != null ? parseFloat(raw.currentPrice)  : null,
		travelFee:      raw.currentPrice  != null && raw.estimatedCost != null
			? Math.max(0, parseFloat(raw.currentPrice) - parseFloat(raw.estimatedCost))
			: 0,
		dispatchStage:  raw.dispatchStage  ?? 0,
		currentRadius:  raw.currentRadius  ?? 5,
		finalPrice: raw.finalCost != null ? parseFloat(raw.finalCost) : null,

		customerId: raw.userId ?? null,
		driverId: raw.driverId ?? null,
		customerName: raw.customer?.name ?? null,
		customerPhone: raw.customer?.phoneNumber ?? null,
		driverName: raw.driver?.name ?? null,
		driverPhone: raw.driver?.phoneNumber ?? null,

		vehicle: raw.vehicle
			? {
					id:           raw.vehicle.id,
					make:         raw.vehicle.make,
					model:        raw.vehicle.model,
					year:         raw.vehicle.year,
					color:        raw.vehicle.color ?? null,
					licensePlate: raw.vehicle.licensePlate ?? null,
				}
			: null,

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

const VEHICLE_INCLUDE = {
	model: Vehicle,
	as: "vehicle",
	attributes: ["id", "make", "model", "year", "color", "licensePlate"],
	required: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableJobs
// ─────────────────────────────────────────────────────────────────────────────
async function getAvailableJobs() {
	const jobs = await Job.findAll({
		where: { status: "pending" },
		include: [CUSTOMER_INCLUDE, VEHICLE_INCLUDE],
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

		job.driverId = driverId;
		job.status = "accepted";
		await job.save({ transaction: t });

		// Broadcast to other drivers that this job is taken
		io.to("drivers").emit("job-taken", { jobId: job.id });

		return job;
	});

	// Re-fetch with customer + vehicle JOINs so normalizeJob has name/phone/vehicle
	const jobWithCustomer = await Job.findByPk(result.id, {
		include: [CUSTOMER_INCLUDE, VEHICLE_INCLUDE],
	});

	// Fetch driver info so we can send a rich provider-assigned event to the customer
	const driver = await User.findByPk(driverId, {
		attributes: ["id", "name", "phoneNumber"],
	});
	const driverProfileRecord = await DriverProfile.findOne({
		where: { userId: driverId },
	});

	// Stop dispatch timers — job is no longer available
	const { stopDispatch } = require("./dispatchService");
	stopDispatch(result.id);

	// Emit "provider-assigned" — matches the event name the frontend JobContext listens for
	io.to(String(result.userId)).emit("provider-assigned", {
		jobId: String(result.id),
		provider: {
			id:       String(driverId),
			name:     driver?.name     ?? "Driver",
			phone:    driver?.phoneNumber ?? null,
			vehicle:  driverProfileRecord?.vehicleType ?? "Tow Truck",
			rating:   5.0,
			location: (() => {
				const loc = driverLocationStore.get(driverId);
				return loc ? { latitude: loc.lat, longitude: loc.lng } : null;
			})(),
		},
	});

	return normalizeJob(jobWithCustomer);
}

// Platform keeps this % of the pre-tax job amount; driver receives the rest.
const PLATFORM_FEE_PERCENT = 20;

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

	// Capture the authorized payment server-side
	const baseCost         = job.finalCost ?? job.estimatedCost ?? "0";
	const finalAmountCents = Math.round(parseFloat(String(baseCost)) * 1.13 * 100);
	let   capturedTotal    = null;

	if (job.paymentIntentId) {
		try {
			const captured = await paymentService.capturePayment(
				job.paymentIntentId,
				finalAmountCents,
			);
			capturedTotal      = captured.amount_received / 100;
			job.finalCost      = (capturedTotal / 1.13).toFixed(2);
		} catch (payErr) {
			console.error("[completeJob] Payment capture failed:", payErr.message);
		}
	}

	job.status = "completed";
	await job.save();

	// ── Transfer driver's share to their Stripe Connect account ──────────────
	if (capturedTotal !== null && job.finalCost) {
		try {
			const driver = await User.findByPk(driverId);
			if (driver?.stripeAccountId) {
				// Re-check live payout eligibility from Stripe (don't trust stale DB flag)
				const account = await stripe.accounts.retrieve(driver.stripeAccountId);
				if (account.payouts_enabled) {
					// Driver gets (100 - platform fee)% of pre-tax amount
					const preTaxAmount    = parseFloat(String(job.finalCost));
					const driverShare     = preTaxAmount * (1 - PLATFORM_FEE_PERCENT / 100);
					const driverShareCents = Math.round(driverShare * 100);

					await stripe.transfers.create({
						amount:         driverShareCents,
						currency:       "cad",
						destination:    driver.stripeAccountId,
						transfer_group: `job_${jobId}`,
						metadata:       { jobId: String(jobId), driverId: String(driverId) },
					});
					console.log(`[completeJob] Transferred $${driverShare.toFixed(2)} to driver ${driverId}`);

					// Keep DB flag in sync
					if (!driver.stripePayoutsEnabled) {
						await User.update({ stripePayoutsEnabled: true }, { where: { id: driverId } });
					}
				} else {
					console.warn(`[completeJob] Driver ${driverId} payouts not enabled — skipping transfer`);
				}
			} else {
				console.warn(`[completeJob] Driver ${driverId} has no stripeAccountId — skipping transfer`);
			}
		} catch (transferErr) {
			// Non-fatal: job is already completed and customer charged.
			// Log it so it can be manually reconciled.
			console.error("[completeJob] Transfer to driver failed:", transferErr.message);
		}
	}

	io.to(String(job.userId)).emit("job-completed", {
		jobId:        job.id,
		finalPrice:   job.finalCost ? parseFloat(String(job.finalCost)) : null,
		capturedTotal,
		message:      "Your service is complete! Payment has been processed.",
	});

	const jobWithCustomer = await Job.findByPk(job.id, { include: [CUSTOMER_INCLUDE, VEHICLE_INCLUDE] });
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
			...(driver.email ? { email: driver.email } : {}),
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

	const backendUrl = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
	const accountLink = await stripe.accountLinks.create({
		account:     accountId,
		// Stripe requires https:// URLs. Backend routes redirect to the app deep link.
		refresh_url: `${backendUrl}/stripe/refresh`,
		return_url:  `${backendUrl}/stripe/return`,
		type:        "account_onboarding",
	});

	return { url: accountLink.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyAvailableDrivers  (called from jobService via lazy require)
// ─────────────────────────────────────────────────────────────────────────────
async function notifyAvailableDrivers(job) {
	// Real-time broadcast to all drivers connected via socket (online toggle = joined 'drivers' room)
	io.to("drivers").emit("new-job-available", { jobId: String(job.id) });

	// Push notifications for drivers that are offline / app backgrounded
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
