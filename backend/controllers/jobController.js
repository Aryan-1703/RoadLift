const jobService = require("../services/jobService");
const io = require("../socket");
const { sendPushNotification } = require("../utils/sendPushNotification");
const { Driver, Message } = require("../models");
const { Op } = require("sequelize");

// @desc    Create a new service request
// @route   POST /api/jobs
// @access  Private (User)
const createJob = async (req, res) => {
	try {
		const newJob = await jobService.createJob(req.body, req.user.id);

		res.status(201).json({
			message: "Job created successfully.",
			job: newJob,
		});
	} catch (error) {
		if (error.message === "NO_PAYMENT_METHOD") {
			return res.status(402).json({
				message: "No payment method on file. Please add a card before requesting service.",
				code: "NO_PAYMENT_METHOD",
			});
		}
		if (error.isPaymentError) {
			return res.status(402).json({ message: error.message, code: error.stripeCode });
		}
		console.error("❌ Error in createJob controller:", error);
		res.status(500).json({ message: "Server error while creating job." });
	}
};

// @desc    Cancel a job (customer-initiated). Free when pending; $5 fee once driver assigned.
// @route   PUT /api/jobs/:jobId/cancel
// @access  Private (User who created it)
const cancelJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const userId = req.user.id;

		const { cancellationFee, driverId } = await jobService.cancelJob(jobId, userId);

		// Remove from all driver available-job lists
		io.to("drivers").emit("job-cancelled", { jobId });

		// Notify the assigned driver (if any) individually
		if (driverId) {
			io.to(String(driverId)).emit("job-cancelled-by-customer", {
				jobId,
				cancellationFee,
				message: cancellationFee > 0
					? `Customer cancelled. You'll receive a $${cancellationFee.toFixed(2)} cancellation compensation.`
					: "Customer cancelled the job.",
			});
		}

		res.status(200).json({ message: "Job successfully cancelled.", cancellationFee });
	} catch (error) {
		if (error.message === "Forbidden") {
			return res.status(403).json({ message: "You are not authorized to cancel this job." });
		}
		if (error.message.includes("in progress") || error.message.includes("cannot be cancelled")) {
			return res.status(409).json({ message: error.message });
		}
		console.error("❌ cancelJob error:", error);
		res.status(500).json({ message: "Server error while cancelling job." });
	}
};

// @desc    Driver cancels an accepted job. Job is re-dispatched to find a new driver.
// @route   PUT /api/jobs/:jobId/driver-cancel
// @access  Private (assigned Driver)
const driverCancelJob = async (req, res) => {
	try {
		const { jobId } = req.params;
		const driverId = req.user.id;

		const { customerId } = await jobService.driverCancelJob(jobId, driverId);

		// Notify the customer so their screen switches back to searching
		io.to(String(customerId)).emit("job-cancelled-by-driver", {
			jobId,
			message: "Your driver has cancelled. We're finding you a new one.",
		});

		res.status(200).json({ message: "Job cancelled. Customer is being re-matched with a new driver." });
	} catch (error) {
		if (error.message === "Forbidden") {
			return res.status(403).json({ message: "You are not authorized to cancel this job." });
		}
		if (error.message === "Job not found.") {
			return res.status(404).json({ message: error.message });
		}
		if (error.message.includes("Cannot cancel")) {
			return res.status(409).json({ message: error.message });
		}
		console.error("❌ driverCancelJob error:", error);
		res.status(500).json({ message: error.message || "Server error while cancelling job." });
	}
};

// @desc    Get details of a single job
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = async (req, res) => {
	try {
		const { id } = req.params;
		const job = await jobService.getJobById(id);
		if (!job) {
			return res.status(404).json({ message: "Job not found." });
		}
		res.status(200).json(job);
	} catch (error) {
		console.error("❌ Error fetching job by ID:", error);
		res.status(500).json({ message: "Server error." });
	}
};

const submitReview = async (req, res) => {
	try {
		const { jobId } = req.params;
		const reviewData = req.body; // { rating, comment }
		const author = { id: req.user.id, role: req.user.role };

		const review = await jobService.submitReview(jobId, reviewData, author);
		res.status(201).json(review);
	} catch (error) {
		if (error.message === "Forbidden") {
			return res
				.status(403)
				.json({ message: "You are not authorized to review this job." });
		}
		res.status(500).json({ message: "Server error while submitting review." });
	}
};

// @desc    Get chat messages for a job
// @route   GET /api/jobs/:jobId/messages
// @access  Private (customer or driver on this job)
const getMessages = async (req, res) => {
	try {
		const { jobId } = req.params;
		const messages = await Message.findAll({
			where: { jobId },
			order: [["createdAt", "ASC"]],
			attributes: ["id", "jobId", "senderId", "senderRole", "text", "createdAt"],
		});
		res.status(200).json(messages);
	} catch (error) {
		console.error("❌ Error fetching messages:", error);
		res.status(500).json({ message: "Server error." });
	}
};

module.exports = {
	createJob,
	cancelJob,
	submitReview,
	getJobById,
	getMessages,
	driverCancelJob,
};
