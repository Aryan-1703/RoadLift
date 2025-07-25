const paymentService = require("../services/paymentService");

const createSetupIntent = async (req, res) => {
	try {
		const { setupIntent, ephemeralKey, stripeCustomerId } =
			await paymentService.createSetupIntent(req.user.id);

		// Send all three secrets the frontend needs to initialize the Payment Sheet.
		res.status(200).json({
			setupIntent: setupIntent.client_secret,
			ephemeralKey: ephemeralKey.secret,
			customer: stripeCustomerId,
		});
	} catch (error) {
		console.error("❌ Error creating Setup Intent:", error);
		res.status(500).json({ message: "Failed to initialize payment method setup." });
	}
};

const getPaymentMethods = async (req, res) => {
	try {
		// req.user is attached by our 'protect' middleware.
		if (!req.user.stripeCustomerId) {
			return res.status(200).json([]);
		}

		const paymentMethods = await paymentService.getPaymentMethods(
			req.user.stripeCustomerId
		);
		res.status(200).json(paymentMethods);
	} catch (error) {
		console.error("❌ Error fetching payment methods:", error);
		res.status(500).json({ message: "Failed to retrieve payment methods." });
	}
};

const setAsDefault = async (req, res) => {
	try {
		const { paymentMethodId } = req.body;
		await paymentService.setAsDefault(req.user.id, paymentMethodId);
		res.status(200).json({ message: "Default payment method updated." });
	} catch (error) {
		res.status(500).json({ message: "Failed to update default payment method." });
	}
};

const deletePaymentMethod = async (req, res) => {
	try {
		const { paymentMethodId } = req.params;
		await paymentService.deletePaymentMethod(paymentMethodId);
		res.status(200).json({ message: "Payment method detached." });
	} catch (error) {
		res.status(500).json({ message: "Failed to delete payment method." });
	}
};

module.exports = {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
};
