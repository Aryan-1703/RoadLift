const paymentService = require("../services/paymentService");

const createSetupIntent = async (req, res) => {
	try {
		const setupIntent = await paymentService.createSetupIntent(req.user.id);

		// Send back the client_secret to the frontend
		res.status(200).json({
			clientSecret: setupIntent.client_secret,
		});
	} catch (error) {
		console.error("Error creating Setup Intent:", error);
		res.status(500).json({ message: "Failed to initialize payment method setup." });
	}
};

module.exports = { createSetupIntent };
