const driverService = require("../services/driverService");
const jobService = require("../services/jobService");
const { User, Job } = require("../models");
const { Op } = require("sequelize");
const io = require("../socket");

// ── getAvailableJobs ──────────────────────────────────────────────────────────
const getAvailableJobs = async (req, res) => {
	try {
		if (!req.user.isActive) {
			return res.status(403).json({ message: "You must be active to view jobs." });
		}
		const jobs = await driverService.getAvailableJobs();
		return res.status(200).json(jobs);
	} catch (error) {
		console.error("Error fetching available jobs:", error);
		return res.status(500).json({ message: "Server error." });
	}
};

// ── acceptJob ─────────────────────────────────────────────────────────────────
const acceptJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		const updatedJob = await driverService.acceptJob(jobId, driverId);
		return res.status(200).json(updatedJob);
	} catch (error) {
		console.error("Error accepting job:", error.message);
		if (error.message.includes("longer available")) {
			return res.status(409).json({ message: error.message });
		}
		return res.status(500).json({ message: "Server error while accepting job." });
	}
};

// ── updateJobStatus — ARRIVED / IN_PROGRESS ───────────────────────────────────
const updateJobStatus = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		const { status } = req.body;

		if (!status) {
			return res.status(400).json({ message: "status is required." });
		}

		const updatedJob = await jobService.updateJobStatus(jobId, driverId, status);

		// Notify customer in real time
		if (updatedJob.customerId) {
			const statusMessages = {
				arrived: "Your driver has arrived!",
				in_progress: "Service has started.",
			};
			io.to(String(updatedJob.customerId)).emit("job-status-updated", {
				jobId: updatedJob.id,
				status: updatedJob.status,
				message: statusMessages[updatedJob.status] || "Job status updated.",
			});
		}

		return res.status(200).json(updatedJob);
	} catch (error) {
		if (error.message === "Forbidden") {
			return res.status(403).json({ message: "Not authorized to update this job." });
		}
		if (error.message.startsWith("Invalid status")) {
			return res.status(400).json({ message: error.message });
		}
		console.error("Error updating job status:", error.message);
		return res.status(500).json({ message: "Server error while updating job status." });
	}
};

// ── completeJob ───────────────────────────────────────────────────────────────
const completeJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		const updatedJob = await driverService.completeJob(jobId, driverId);
		return res.status(200).json(updatedJob);
	} catch (error) {
		if (error.message === "Forbidden") {
			return res
				.status(403)
				.json({ message: "You are not authorized to complete this job." });
		}
		return res.status(500).json({ message: "Server error while completing job." });
	}
};

// ── getEarnings ───────────────────────────────────────────────────────────────
// GET /api/driver/earnings
// Returns today's earnings total + all completed jobs for this driver.
const getEarnings = async (req, res) => {
	try {
		const driverId = req.user.id;

		// All completed jobs for this driver
		const completedJobs = await Job.findAll({
			where: { driverId, status: "completed" },
			order: [["updatedAt", "DESC"]],
			// Only pull the columns the dashboard needs — keeps payload small
			attributes: ["id", "serviceType", "estimatedCost", "finalCost", "updatedAt"],
		});

		// Today's earnings: sum finalCost (fall back to estimatedCost) for jobs
		// completed since midnight local time.
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const todayJobs = completedJobs.filter(j => new Date(j.updatedAt) >= startOfToday);

		const sumJob = j => parseFloat(j.finalCost ?? j.estimatedCost ?? "0");

		const todayTotal = todayJobs.reduce((acc, j) => acc + sumJob(j), 0);

		// Shape each job for the frontend
		const { normalizeJob } = require("../services/driverService");
		const jobList = completedJobs.map(j => ({
			id: String(j.id),
			serviceType: j.serviceType,
			amount: sumJob(j),
			completedAt: j.updatedAt,
		}));

		return res.status(200).json({
			data: {
				today: parseFloat(todayTotal.toFixed(2)),
				completedJobs: jobList,
			},
		});
	} catch (error) {
		console.error("Error fetching earnings:", error);
		return res.status(500).json({ message: "Server error while fetching earnings." });
	}
};

// ── updateStatus (driver online/offline toggle) ───────────────────────────────
const updateStatus = async (req, res) => {
	try {
		const driverId = req.user.id;
		const { isActive } = req.body;

		if (typeof isActive !== "boolean") {
			return res.status(400).json({ message: "isActive must be a boolean." });
		}

		await User.update({ isActive }, { where: { id: driverId } });
		return res.status(200).json({ isActive });
	} catch (error) {
		console.error("Failed to update driver status:", error);
		return res.status(500).json({ message: "Server error while updating status." });
	}
};

// ── storePushToken ────────────────────────────────────────────────────────────
const storePushToken = async (req, res) => {
	try {
		const { token: pushToken } = req.body;
		if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
			return res.status(400).json({ message: "Invalid push token." });
		}
		await User.update({ pushToken }, { where: { id: req.user.id } });
		return res.status(200).json({ message: "Push token saved successfully." });
	} catch (error) {
		console.error("Error saving push token:", error);
		return res.status(500).json({ message: "Server error." });
	}
};

// ── removePushToken ───────────────────────────────────────────────────────────
const removePushToken = async (req, res) => {
	try {
		await User.update({ pushToken: null }, { where: { id: req.user.id } });
		return res.status(200).json({ message: "Push token removed." });
	} catch (error) {
		console.error("Error removing push token:", error);
		return res.status(500).json({ message: "Failed to remove push token." });
	}
};

// ── createStripeOnboardingLink ────────────────────────────────────────────────
const createStripeOnboardingLink = async (req, res) => {
	try {
		const driverId = req.user.id;
		const accountLink = await driverService.createStripeOnboardingLink(driverId);
		return res.status(200).json(accountLink);
	} catch (error) {
		console.error("Failed to create Stripe onboarding link:", error);
		return res
			.status(500)
			.json({ message: "Server error while creating onboarding link." });
	}
};

// ── getPayoutStatus — checks live Stripe account state ───────────────────────
// GET /api/driver/payout-status
// Returns: { status: "not_connected"|"pending"|"active", payoutsEnabled, detailsSubmitted, requirementsCount }
const stripe = require("../config/stripe");
const getPayoutStatus = async (req, res) => {
	try {
		const driver = await User.findByPk(req.user.id);
		if (!driver?.stripeAccountId) {
			return res.status(200).json({ status: "not_connected", payoutsEnabled: false, detailsSubmitted: false, requirementsCount: 0 });
		}

		const account = await stripe.accounts.retrieve(driver.stripeAccountId);
		const payoutsEnabled     = account.payouts_enabled ?? false;
		const detailsSubmitted   = account.details_submitted ?? false;
		const requirementsCount  = account.requirements?.currently_due?.length ?? 0;

		// Sync DB flag if it changed
		if (payoutsEnabled !== driver.stripePayoutsEnabled) {
			await User.update({ stripePayoutsEnabled: payoutsEnabled }, { where: { id: driver.id } });
		}

		const status = payoutsEnabled ? "active" : detailsSubmitted ? "pending" : "incomplete";
		return res.status(200).json({ status, payoutsEnabled, detailsSubmitted, requirementsCount });
	} catch (error) {
		console.error("Failed to fetch payout status:", error);
		return res.status(500).json({ message: "Server error while fetching payout status." });
	}
};

module.exports = {
	getAvailableJobs,
	acceptJob,
	updateJobStatus,
	completeJob,
	getEarnings,
	updateStatus,
	storePushToken,
	removePushToken,
	createStripeOnboardingLink,
	getPayoutStatus,
};
