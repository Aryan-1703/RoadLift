const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const { protect } = require("../middleware/authMiddleware"); // Import the middleware

// To create a job, the user must be authenticated.
// The 'protect' middleware will run before the 'createJob' controller.
router.post("/", protect, jobController.createJob);

module.exports = router;
