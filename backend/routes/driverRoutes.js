const express = require("express");
const router = express.Router();
const {
	getAvailableJobs,
	acceptJob,
	updateJobStatus,
	completeJob,
	getEarnings,
	updateStatus,
	storePushToken,
	createStripeOnboardingLink,
	removePushToken,
	getPayoutStatus,
	getServiceStatus,
	uploadEquipment,
	toggleService,
} = require("../controllers/driverController");

// ── Multer: disk storage for equipment uploads ─────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs_    = require('fs');
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs_.existsSync(uploadDir)) fs_.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadDir),
	filename:    (_req, file, cb) => {
		const ext = path.extname(file.originalname) || '.jpg';
		cb(null, 'equip_' + Date.now() + '_' + Math.random().toString(36).slice(2) + ext);
	},
});
const upload = multer({
	storage,
	limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
	fileFilter: (_req, file, cb) => {
		const allowed = /image\/|video\//;
		cb(null, allowed.test(file.mimetype));
	},
});
const { protect, protectDriver } = require("../middleware/authMiddleware");

// Jobs
router.get("/jobs/active", protect, protectDriver, async (req, res) => {
	try {
		const { Job, User, Vehicle } = require("../models");
		const job = await Job.findOne({
			where: {
				driverId: req.user.id,
				status:   ["accepted", "arrived", "in_progress"],
			},
			include: [
				{ model: User,    as: "customer", attributes: ["id", "name", "phoneNumber"] },
				{ model: Vehicle, as: "vehicle",  attributes: ["id", "make", "model", "year", "color", "licensePlate"], required: false },
			],
			order: [["updatedAt", "DESC"]],
		});
		if (!job) return res.json(null);
		const { normalizeJob } = require("../services/driverService");
		res.json(normalizeJob(job));
	} catch (err) {
		console.error("[driverRoutes] /jobs/active error:", err);
		res.status(500).json({ message: "Failed to fetch active job." });
	}
});
router.get("/jobs/available", protect, protectDriver, getAvailableJobs);
router.put("/jobs/:jobId/accept", protect, protectDriver, acceptJob);
router.put("/jobs/:jobId/status", protect, protectDriver, updateJobStatus);
router.put("/jobs/:jobId/complete", protect, protectDriver, completeJob);

// Service qualifications
router.get("/services",                            protect, protectDriver, getServiceStatus);
router.post("/equipment/upload/:serviceType",      protect, protectDriver, upload.single('file'), uploadEquipment);
router.put("/services/:serviceKey/toggle",         protect, protectDriver, toggleService);

// Earnings
router.get("/earnings", protect, protectDriver, getEarnings);

// Online / offline toggle
router.put("/status", protect, protectDriver, updateStatus);

// Push tokens
router.post("/store-push-token", protect, storePushToken);
router.delete("/remove-push-token", protect, protectDriver, removePushToken);

// Stripe Connect
router.post("/stripe-onboarding", protect, protectDriver, createStripeOnboardingLink);
router.get("/payout-status",      protect, protectDriver, getPayoutStatus);

module.exports = router;
