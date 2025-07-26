const express = require("express");
const router = express.Router();
const {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// The endpoint to initialize the Stripe Payment Sheet.
router.post("/create-setup-intent", protect, createSetupIntent);
// The new endpoint to get a list of a customer's saved cards.
router.get("/methods", protect, getPaymentMethods);
// PUT /api/payments/set-default
router.put("/set-default", protect, setAsDefault);
// DELETE /api/payments/methods/:paymentMethodId
router.delete("/methods/:paymentMethodId", protect, deletePaymentMethod);

module.exports = router;
