const { Job, User, sequelize } = require("../models");

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

const acceptJob = async (jobId, driverId, io) => {
	return await sequelize.transaction(async t => {
		const job = await Job.findByPk(jobId, {
			transaction: t,
			lock: t.LOCK.UPDATE,
		});

		if (!job) throw new Error("Job not found.");
		if (job.status !== "pending") throw new Error("Job is no longer available.");

		job.driverId = driverId;
		job.status = "accepted";
		await job.save({ transaction: t });

		if (io) {
			io.to(job.userId).emit("job-accepted", {
				jobId: job.id,
				message: "A driver has accepted your request!",
			});
			console.log(`Emitted 'job-accepted' event to room: ${job.userId}`);
		}

		return job;
	});
};

module.exports = { getAvailableJobs, acceptJob };
