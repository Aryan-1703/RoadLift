const paymentService = require("../services/paymentService");
const stripe = require("../config/stripe");
const { User, Job } = require("../models");
const io = require("../socket");

const createSetupIntent = async (req, res) => {
	try {
		const result = await paymentService.createSetupIntent(req.user.id);
		res.status(200).json(result); // { setupIntent, ephemeralKey, customer }
	} catch (error) {
		console.error("Error creating Setup Intent:", error);
		res.status(500).json({ message: "Failed to initialize payment method setup." });
	}
};

const getPaymentMethods = async (req, res) => {
	try {
		if (!req.user.stripeCustomerId) return res.status(200).json([]);
		const methods = await paymentService.getPaymentMethods(
			req.user.stripeCustomerId,
			req.user.defaultPaymentMethodId, // so isDefault is marked correctly
		);
		res.status(200).json(methods);
	} catch (error) {
		console.error("Error fetching payment methods:", error);
		res.status(500).json({ message: "Failed to retrieve payment methods." });
	}
};

const setAsDefault = async (req, res) => {
	try {
		const { paymentMethodId } = req.body;
		if (!paymentMethodId)
			return res.status(400).json({ message: "paymentMethodId is required." });
		await paymentService.setAsDefault(req.user.id, paymentMethodId);
		res.status(200).json({ message: "Default payment method updated." });
	} catch (error) {
		console.error("Error setting default:", error);
		res.status(500).json({ message: "Failed to update default payment method." });
	}
};

const deletePaymentMethod = async (req, res) => {
	try {
		const { paymentMethodId } = req.params;
		await paymentService.deletePaymentMethod(paymentMethodId);
		res.status(200).json({ message: "Payment method removed." });
	} catch (error) {
		console.error("Error deleting payment method:", error);
		res.status(500).json({ message: "Failed to delete payment method." });
	}
};

// Called by PaymentScreen — returns the three secrets Payment Sheet needs
const createPaymentIntent = async (req, res) => {
	try {
		const result = await paymentService.createPaymentIntent(req.body, req.user);
		// result = { paymentIntentClientSecret, ephemeralKey, customer }
		res.status(200).json(result);
	} catch (error) {
		console.error("Error creating Payment Intent:", error);
		res.status(500).json({ message: error.message || "Failed to initialize payment." });
	}
};

// Called by PaymentScreen after Stripe Payment Sheet succeeds — records finalCost
// and notifies the driver via socket that payment was received.
const confirmPayment = async (req, res) => {
	try {
		const { jobId, amount } = req.body; // amount in cents
		if (!jobId) return res.status(400).json({ message: "jobId is required." });

		const job = await Job.findByPk(jobId);
		if (!job) return res.status(404).json({ message: "Job not found." });
		if (job.userId !== req.user.id)
			return res.status(403).json({ message: "Forbidden." });

		// Persist the final paid amount (cents → dollars)
		if (amount && !job.finalCost) {
			job.finalCost = (Number(amount) / 100).toFixed(2);
			await job.save();
		}

		// Notify driver in real time
		if (job.driverId) {
			io.to(String(job.driverId)).emit("payment-received", {
				jobId:  String(job.id),
				amount: parseFloat(job.finalCost ?? job.estimatedCost ?? "0"),
			});
		}

		return res.status(200).json({ message: "Payment confirmed." });
	} catch (error) {
		console.error("Error confirming payment:", error);
		return res.status(500).json({ message: "Failed to confirm payment." });
	}
};

// Creates a manual-capture PI for Apple Pay pre-authorization.
// Frontend calls this before presenting the Apple Pay sheet, then calls
// confirmApplePayPayment(clientSecret) to authorize the hold.
const createApplePayPreAuth = async (req, res) => {
	try {
		const { estimatedCost } = req.body;
		const user = await User.findByPk(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found." });

		const customerId = await paymentService.ensureStripeCustomer(user);
		const amountCents = estimatedCost
			? Math.round(parseFloat(estimatedCost) * 1.13 * 100)
			: 5000;

		const pi = await stripe.paymentIntents.create({
			amount:               amountCents,
			currency:             "cad",
			customer:             customerId,
			capture_method:       "manual",
			payment_method_types: ["card"],
			metadata:             { userId: String(req.user.id) },
		});

		return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
	} catch (err) {
		console.error("createApplePayPreAuth error:", err);
		return res.status(500).json({ message: "Failed to create Apple Pay pre-authorization." });
	}
};

module.exports = {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
	createPaymentIntent,
	confirmPayment,
	createApplePayPreAuth,
};
