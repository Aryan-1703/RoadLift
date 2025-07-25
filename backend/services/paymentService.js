const stripe = require("../config/stripe");
const { User } = require("../models");

/**
 * Creates/retrieves a Stripe Customer and prepares a Setup Intent and Ephemeral Key.
 * @param {string} userId - The ID of the user in our database.
 * @returns {object} Contains the setupIntent, stripeCustomerId, and ephemeralKey.
 */
async function createSetupIntent(userId) {
	const user = await User.findByPk(userId);
	if (!user) throw new Error("User not found.");

	let stripeCustomerId = user.stripeCustomerId;

	// If the user is not yet a Stripe customer in our DB, create one on Stripe.
	if (!stripeCustomerId) {
		const customer = await stripe.customers.create({
			name: user.name,
			phone: user.phoneNumber,
			metadata: { ourAppUserId: user.id }, // Link back to our system
		});
		stripeCustomerId = customer.id;

		// Save the new Stripe Customer ID to our database for future use.
		user.stripeCustomerId = stripeCustomerId;
		await user.save();
	}

	// Create an Ephemeral Key. This is a temporary key that gives the frontend
	// permission to act on behalf of the customer for this one session.
	const ephemeralKey = await stripe.ephemeralKeys.create(
		{ customer: stripeCustomerId },
		{ apiVersion: "2023-10-16" } // Use a recent, fixed API version
	);

	// Create a Setup Intent. This is the object that orchestrates card setup.
	const setupIntent = await stripe.setupIntents.create({
		customer: stripeCustomerId,
		payment_method_types: ["card"],
	});

	// Return all necessary components to the controller.
	return { setupIntent, stripeCustomerId, ephemeralKey };
}

/**
 * Retrieves a formatted list of saved payment methods for a Stripe customer.
 * @param {string} stripeCustomerId - The customer's ID from Stripe.
 * @returns {Array} A list of formatted payment method objects.
 */
async function getPaymentMethods(stripeCustomerId) {
	if (!stripeCustomerId) {
		return []; // A user with no Stripe ID has no saved cards.
	}
	const paymentMethods = await stripe.paymentMethods.list({
		customer: stripeCustomerId,
		type: "card",
	});

	// Format the data to send only what the frontend needs.
	return paymentMethods.data.map(pm => ({
		id: pm.id,
		brand: pm.card.brand,
		last4: pm.card.last4,
		exp_month: pm.card.exp_month,
		exp_year: pm.card.exp_year,
	}));
}
// In services/paymentService.js
async function setAsDefault(userId, paymentMethodId) {
	const user = await User.findByPk(userId);
	if (!user || !user.stripeCustomerId)
		throw new Error("User or Stripe Customer not found.");

	// This tells Stripe to use this card for future invoices/payments for this customer
	await stripe.customers.update(user.stripeCustomerId, {
		invoice_settings: {
			default_payment_method: paymentMethodId,
		},
	});

	// Also save it in our own database for quick access
	user.defaultPaymentMethodId = paymentMethodId;
	await user.save();
	return user;
}

async function deletePaymentMethod(paymentMethodId) {
	await stripe.paymentMethods.detach(paymentMethodId);
	return { id: paymentMethodId, status: "detached" };
}

module.exports = {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
};
