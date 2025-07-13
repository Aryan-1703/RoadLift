const express = require("express");
const router = express.Router();
const { createJob } = require("../controllers/jobController");
const { protect } = require("../middleware/authMiddleware");

// The 'protect' middleware will run first. If the token is valid,
// it passes control to the 'createJob' controller.
router.post("/", protect, createJob);

module.exports = router;
