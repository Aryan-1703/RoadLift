const stripe = require("../config/stripe");
const { User } = require("../models");

// ── Ensure Stripe Customer exists, return their ID ────────────────────────────
async function ensureStripeCustomer(user) {
	if (user.stripeCustomerId) {
		// Verify the customer still exists in Stripe (guards against stale IDs
		// after key rotation or test-data cleanup)
		try {
			await stripe.customers.retrieve(user.stripeCustomerId);
			return user.stripeCustomerId;
		} catch (err) {
			if (err?.raw?.code === "resource_missing") {
				// Stale ID — fall through to create a new customer below
				user.stripeCustomerId = null;
				await User.update({ stripeCustomerId: null, defaultPaymentMethodId: null }, { where: { id: user.id } });
			} else {
				throw err;
			}
		}
	}

	const customer = await stripe.customers.create({
		name: user.name,
		email: user.email,
		phone: user.phoneNumber,
		metadata: { appUserId: String(user.id) },
	});

	await User.update({ stripeCustomerId: customer.id }, { where: { id: user.id } });
	user.stripeCustomerId = customer.id;
	return customer.id;
}

// ── createSetupIntent — used by PaymentMethodsScreen to add a new card ────────
// Returns: { setupIntent (client_secret), ephemeralKey (secret), customer (id) }
async function createSetupIntent(userId) {
	const user = await User.findByPk(userId);
	if (!user) throw new Error("User not found.");

	const customerId = await ensureStripeCustomer(user);

	const ephemeralKey = await stripe.ephemeralKeys.create(
		{ customer: customerId },
		{ apiVersion: "2023-10-16" },
	);

	const setupIntent = await stripe.setupIntents.create({
		customer: customerId,
		payment_method_types: ["card"],
		usage: "off_session", // card can be reused for future payments
	});

	return {
		setupIntent: setupIntent.client_secret, // ← string, not object
		ephemeralKey: ephemeralKey.secret, // ← string, not object
		customer: customerId,
		stripeCustomerId: customerId,
	};
}

// ── getPaymentMethods — list saved cards, mark which is default ───────────────
async function getPaymentMethods(stripeCustomerId, defaultPaymentMethodId) {
	if (!stripeCustomerId) return [];

	const list = await stripe.paymentMethods.list({
		customer: stripeCustomerId,
		type: "card",
	});

	// Fall back to the default stored on the Stripe Customer object
	let defaultId = defaultPaymentMethodId;
	if (!defaultId) {
		try {
			const cust = await stripe.customers.retrieve(stripeCustomerId);
			defaultId = cust.invoice_settings?.default_payment_method ?? null;
		} catch {
			/* non-fatal */
		}
	}

	return list.data.map(pm => ({
		id: pm.id,
		brand: pm.card.brand,
		last4: pm.card.last4,
		expMonth: pm.card.exp_month,
		expYear: pm.card.exp_year,
		isDefault: pm.id === defaultId,
	}));
}

// ── setAsDefault ──────────────────────────────────────────────────────────────
async function setAsDefault(userId, paymentMethodId) {
	const user = await User.findByPk(userId);
	if (!user || !user.stripeCustomerId)
		throw new Error("User or Stripe Customer not found.");

	await stripe.customers.update(user.stripeCustomerId, {
		invoice_settings: { default_payment_method: paymentMethodId },
	});

	await User.update(
		{ defaultPaymentMethodId: paymentMethodId },
		{ where: { id: userId } },
	);
	return { success: true };
}

// ── deletePaymentMethod ───────────────────────────────────────────────────────
async function deletePaymentMethod(paymentMethodId) {
	await stripe.paymentMethods.detach(paymentMethodId);
	return { id: paymentMethodId, status: "detached" };
}

// ── createPaymentIntent — called by PaymentScreen checkout flow ───────────────
// Returns the exact shape that Stripe Payment Sheet's initPaymentSheet() needs:
//   { paymentIntentClientSecret, ephemeralKey, customer }
async function createPaymentIntent(jobDetails, user) {
	const dbUser = await User.findByPk(user.id);
	if (!dbUser) throw new Error("User not found.");

	const customerId = await ensureStripeCustomer(dbUser);

	const ephemeralKey = await stripe.ephemeralKeys.create(
		{ customer: customerId },
		{ apiVersion: "2023-10-16" },
	);

	// Amount comes in as cents from the frontend (Math.round(total * 100))
	const amount = jobDetails.amount
		? Math.round(Number(jobDetails.amount))
		: Math.round(parseFloat(jobDetails.estimatedCost ?? "0") * 100);

	if (!amount || amount <= 0) throw new Error("Invalid payment amount.");

	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: "cad",
		customer: customerId,
		automatic_payment_methods: { enabled: true },
		// Pre-select the default card if one is saved
		...(dbUser.defaultPaymentMethodId && {
			payment_method: dbUser.defaultPaymentMethodId,
		}),
		metadata: { jobId: String(jobDetails.jobId ?? "") },
	});

	return {
		paymentIntentClientSecret: paymentIntent.client_secret, // ← correct key name
		ephemeralKey: ephemeralKey.secret,
		customer: customerId,
	};
}

// ── createPaymentIntentForJob — called internally when driver accepts ─────────
async function createPaymentIntentForJob(job, customerUser) {
	const customerId = await ensureStripeCustomer(customerUser);
	const amountCents = job.estimatedCost
		? Math.round(parseFloat(job.estimatedCost) * 100)
		: 5000;

	const paymentIntent = await stripe.paymentIntents.create({
		amount: amountCents,
		currency: "cad",
		customer: customerId,
		setup_future_usage: "off_session",
		payment_method_types: ["card"],
		metadata: { jobId: String(job.id) },
	});

	return paymentIntent;
}

// ── authorizePayment — places a hold on customer's default card at job request ─
async function authorizePayment(job, customer) {
	const customerId = await ensureStripeCustomer(customer);

	let paymentMethodId = customer.defaultPaymentMethodId;

	if (!paymentMethodId) {
		// Tier 1: check Stripe customer's invoice default
		try {
			const stripeCustomer = await stripe.customers.retrieve(customerId);
			paymentMethodId = stripeCustomer.invoice_settings?.default_payment_method ?? null;
		} catch (e) { /* ignore — fall through to Tier 2 */ }
	}

	if (!paymentMethodId) {
		// Tier 2: use any attached card on the customer
		try {
			const pmList = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
			paymentMethodId = pmList.data[0]?.id ?? null;
		} catch (e) { /* ignore — fall through to error */ }
	}

	if (!paymentMethodId) {
		throw new Error("NO_PAYMENT_METHOD");
	}

	// Sync the resolved PM back to DB so future requests skip the fallback
	if (paymentMethodId !== customer.defaultPaymentMethodId) {
		await User.update({ defaultPaymentMethodId: paymentMethodId }, { where: { id: customer.id } });
		customer.defaultPaymentMethodId = paymentMethodId;
	}

	// Authorize estimated cost + 13% tax (in cents)
	const estimatedCents = job.estimatedCost
		? Math.round(parseFloat(job.estimatedCost) * 1.13 * 100)
		: 5000;

	// Ensure the PM is attached to this customer before off-session use.
	// If it was ever used without a customer it becomes unattachable — surface
	// a friendly error so the user knows to remove and re-add their card.
	try {
		await stripe.paymentMethods.attach(customer.defaultPaymentMethodId, {
			customer: customerId,
		});
	} catch (attachErr) {
		if (attachErr?.raw?.code !== "payment_method_already_attached") {
			const err = new Error(
				"Your saved card could not be used. Please remove it and add it again.",
			);
			err.isPaymentError = true;
			throw err;
		}
		// already attached to this customer — that's the expected happy path
	}

	const paymentIntent = await stripe.paymentIntents.create({
		amount:                   estimatedCents,
		currency:                 "cad",
		customer:                 customerId,
		payment_method:           customer.defaultPaymentMethodId,
		payment_method_types:     ["card"],
		capture_method:           "manual",
		confirm:                  true,
		off_session:              true,
		error_on_requires_action: true,
		metadata: { jobId: String(job.id) },
	});

	return paymentIntent;
}

// ── capturePayment — captures the held amount when driver completes the job ────
async function capturePayment(paymentIntentId, finalAmountCents) {
	const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
	// Cannot capture more than the authorized amount
	const amountToCapture = Math.min(finalAmountCents, intent.amount);
	return stripe.paymentIntents.capture(paymentIntentId, {
		amount_to_capture: amountToCapture,
	});
}

// ── cancelAuthorization — releases the hold when job is cancelled ─────────────
async function cancelAuthorization(paymentIntentId) {
	try {
		await stripe.paymentIntents.cancel(paymentIntentId);
	} catch (err) {
		console.warn("[paymentService] Could not cancel authorization:", err.message);
	}
}

// ── capturePartialAndCancel — charges only the fee amount; Stripe auto-releases the rest ──
async function capturePartialAndCancel(paymentIntentId, feeCents) {
	const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
	const amountToCapture = Math.min(feeCents, intent.amount);
	return stripe.paymentIntents.capture(paymentIntentId, {
		amount_to_capture: amountToCapture,
	});
}

module.exports = {
	ensureStripeCustomer,
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
	createPaymentIntent,
	createPaymentIntentForJob,
	authorizePayment,
	capturePayment,
	cancelAuthorization,
	capturePartialAndCancel,
};
