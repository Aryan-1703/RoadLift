const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { User } = require("../models");

/**
 * Creates a Stripe Customer and a SetupIntent for saving a card.
 * @param {string} userId - The ID of the user in our database.
 * @returns {object} The SetupIntent object from Stripe.
 */
async function createSetupIntent(userId) {
	// Find the user in our database
	const user = await User.findByPk(userId);
	if (!user) throw new Error("User not found.");

	let stripeCustomerId = user.stripeCustomerId;

	// If the user is not yet a Stripe customer, create one.
	if (!stripeCustomerId) {
		const customer = await stripe.customers.create({
			// You can add name, email, etc. here for better records
			name: user.name,
			phone: user.phoneNumber,
			// Add a reference back to our internal user ID
			metadata: { ourUserId: user.id },
		});
		stripeCustomerId = customer.id;

		// Save the new Stripe Customer ID to our database
		user.stripeCustomerId = stripeCustomerId;
		await user.save();
	}

	// Now, create a SetupIntent for this customer.
	const setupIntent = await stripe.setupIntents.create({
		customer: stripeCustomerId,
		// We specify card, but can add others like 'us_bank_account'
		payment_method_types: ["card", "apple_pay", "google_pay"],
	});

	return setupIntent;
}

module.exports = { createSetupIntent };
