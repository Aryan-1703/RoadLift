const { Job, User, sequelize, Driver } = require("../models");
const io = require("../socket");

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

module.exports = { getAvailableJobs, acceptJob, updateStatus };
