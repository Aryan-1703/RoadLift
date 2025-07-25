const express = require("express");
const router = express.Router();
const { createSetupIntent } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// POST /api/payments/create-setup-intent
// This is the endpoint our app will call to start the process.
router.post("/create-setup-intent", protect, createSetupIntent);

module.exports = router;
