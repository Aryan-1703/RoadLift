const express = require("express");
const router = express.Router();
const { getAvailableJobs } = require("../controllers/driverController");
const { protect, protectDriver } = require("../middleware/authMiddleware");

// GET /api/driver/jobs/available
// The request first checks for a valid token (protect),
// then checks if the token belongs to a driver (protectDriver).
router.get("/jobs/available", protect, protectDriver, getAvailableJobs);

module.exports = router;
