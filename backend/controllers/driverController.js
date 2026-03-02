const driverService = require("../services/driverService");
const { User } = require("../models");

// All handlers receive req.user from the `protect` middleware.
// req.user is now always a User instance (role = 'DRIVER' enforced by protectDriver).

// @desc    Get all pending jobs available for acceptance
// @route   GET /api/driver/jobs/available
// @access  DRIVER
const getAvailableJobs = async (req, res) => {
	try {
		// isActive on the unified users table
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

// @desc    Accept a pending job
// @route   PUT /api/driver/jobs/:jobId/accept
// @access  DRIVER
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

// @desc    Mark an accepted job as complete
// @route   PUT /api/driver/jobs/:jobId/complete
// @access  DRIVER
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

// @desc    Toggle driver online/offline
// @route   PUT /api/driver/status
// @access  DRIVER
const updateStatus = async (req, res) => {
	try {
		const driverId = req.user.id;
		const { isActive } = req.body;

		if (typeof isActive !== "boolean") {
			return res.status(400).json({ message: "isActive must be a boolean." });
		}

		// isActive now lives on the users table
		const updated = await User.update({ isActive }, { where: { id: driverId } });
		return res.status(200).json({ isActive });
	} catch (error) {
		console.error("Failed to update driver status:", error);
		return res.status(500).json({ message: "Server error while updating status." });
	}
};

// @desc    Store Expo push token
// @route   POST /api/driver/store-push-token
// @access  DRIVER
const storePushToken = async (req, res) => {
	try {
		const { token: pushToken } = req.body;

		if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
			return res.status(400).json({ message: "Invalid push token." });
		}

		// pushToken now on unified users table
		await User.update({ pushToken }, { where: { id: req.user.id } });
		return res.status(200).json({ message: "Push token saved successfully." });
	} catch (error) {
		console.error("Error saving push token:", error);
		return res.status(500).json({ message: "Server error." });
	}
};

// @desc    Remove Expo push token (on logout)
// @route   DELETE /api/driver/remove-push-token
// @access  DRIVER
const removePushToken = async (req, res) => {
	try {
		await User.update({ pushToken: null }, { where: { id: req.user.id } });
		return res.status(200).json({ message: "Push token removed." });
	} catch (error) {
		console.error("Error removing push token:", error);
		return res.status(500).json({ message: "Failed to remove push token." });
	}
};

// @desc    Create Stripe Connect onboarding link for driver
// @route   POST /api/driver/stripe-onboarding
// @access  DRIVER
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

module.exports = {
	getAvailableJobs,
	acceptJob,
	completeJob,
	updateStatus,
	storePushToken,
	removePushToken,
	createStripeOnboardingLink,
};
