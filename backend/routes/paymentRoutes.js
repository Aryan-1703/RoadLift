const express = require("express");
const router = express.Router();
const {
	createSetupIntent,
	getPaymentMethods,
	setAsDefault,
	deletePaymentMethod,
	createPaymentIntent,
	confirmPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create-setup-intent",    protect, createSetupIntent);
router.get("/methods",                 protect, getPaymentMethods);
router.put("/set-default",             protect, setAsDefault);
router.delete("/methods/:paymentMethodId", protect, deletePaymentMethod);
router.post("/create-payment-intent",  protect, createPaymentIntent);
// Called by PaymentScreen after Stripe confirms the charge
router.post("/confirm-payment",        protect, confirmPayment);

module.exports = router;
