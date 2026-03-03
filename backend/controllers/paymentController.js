const paymentService = require("../services/paymentService");
const { User } = require("../models");

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

module.exports = {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
	createPaymentIntent,
};
