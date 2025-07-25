const driverService = require("../services/driverService");
const { Driver } = require("../models");

// @desc    Get all available (pending) jobs
// @route   GET /api/driver/jobs/available
// @access  Private (Driver)
const getAvailableJobs = async (req, res) => {
	try {
		const driverId = req.user.id;
		// Fetch the driver
		const driver = await Driver.findByPk(driverId);
		if (!driver || !driver.isActive) {
			return res.status(403).json({ message: "You must be active to view jobs." });
		}
		// Continue with job fetch
		const jobs = await driverService.getAvailableJobs();
		res.status(200).json(jobs);
	} catch (error) {
		console.error("Error fetching available jobs:", error);
		res.status(500).json({ message: "Server error." });
	}
};

// @desc    Accept a pending job
// @route   PUT /api/driver/jobs/:jobId/accept
// @access  Private (Driver)
const acceptJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		// The service handles the 'io' instance internally
		const updatedJob = await driverService.acceptJob(jobId, driverId);
		res.status(200).json(updatedJob);
	} catch (error) {
		console.error("Error accepting job:", error.message);
		if (error.message.includes("longer available")) {
			return res.status(409).json({ message: error.message });
		}
		res.status(500).json({ message: "Server error while accepting job." });
	}
};

// @desc    Mark an accepted job as complete
// @route   PUT /api/driver/jobs/:jobId/complete
// @access  Private (Driver who accepted it)
const completeJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;
		const updatedJob = await driverService.completeJob(jobId, driverId);
		res.status(200).json(updatedJob);
	} catch (error) {
		if (error.message === "Forbidden") {
			return res
				.status(403)
				.json({ message: "You are not authorized to complete this job." });
		}
		res.status(500).json({ message: "Server error while completing job." });
	}
};

const updateStatus = async (req, res) => {
	try {
		const driverId = req.user.id;
		const { isActive } = req.body;

		if (typeof isActive !== "boolean") {
			return res.status(400).json({ message: "isActive must be a boolean." });
		}

		const updatedDriver = await driverService.updateStatus(driverId, isActive);
		return res.status(200).json(updatedDriver);
	} catch (error) {
		console.error("❌ Failed to update driver status:", error);
		return res.status(500).json({ message: "Server error while updating status." });
	}
};
const storePushToken = async (req, res) => {
	try {
		const userId = req.user.id;
		const { token: pushToken } = req.body;

		if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
			return res.status(400).json({ message: "Invalid push token." });
		}

		const driver = await Driver.findByPk(userId);
		if (!driver) {
			return res.status(404).json({ message: "Driver not found." });
		}

		driver.pushToken = pushToken;
		await driver.save();

		return res.status(200).json({ message: "Push token saved successfully." });
	} catch (error) {
		console.error("❌ Error saving push token:", error);
		return res.status(500).json({ message: "Server error." });
	}
};
const removePushToken = async (req, res) => {
	try {
		const userId = req.user.id;
		await Driver.update({ pushToken: null }, { where: { id: userId } });
		res.status(200).json({ message: "Push token removed." });
	} catch (err) {
		console.error("Error removing push token:", err);
		res.status(500).json({ message: "Failed to remove push token." });
	}
};
const createStripeOnboardingLink = async (req, res) => {
	try {
		const driverId = req.user.id;
		const accountLink = await driverService.createStripeOnboardingLink(driverId);
		res.status(200).json(accountLink);
	} catch (error) {
		console.error("Failed to create Stripe onboarding link:", error);
		res.status(500).json({ message: "Server error while creating onboarding link." });
	}
};

module.exports = {
	getAvailableJobs,
	acceptJob,
	completeJob,
	updateStatus,
	storePushToken,
	removePushToken,
	createStripeOnboardingLink,
};
