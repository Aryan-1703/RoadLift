const express = require("express");
const router  = express.Router();
const { protect, protectAdmin } = require("../middleware/authMiddleware");

const SERVICE_KEY_MAP = {
	"battery-boost": "battery", battery: "battery",
	lockout: "lockout", "door-lockout": "lockout",
	"fuel-delivery": "fuel", fuel: "fuel",
	"tire-change": "tire", tire: "tire",
};

// PATCH /api/admin/driver/:driverId/service/:serviceType
// Body: { status: "approved" | "rejected" | "unapproved" }
router.patch("/driver/:driverId/service/:serviceType", protect, protectAdmin, async (req, res) => {
	try {
		const { DriverProfile } = require("../models");
		const { driverId, serviceType } = req.params;
		const { status } = req.body;

		const serviceKey = SERVICE_KEY_MAP[serviceType];
		if (!serviceKey) {
			return res.status(400).json({ message: "Invalid service type." });
		}
		if (!["approved", "rejected", "unapproved"].includes(status)) {
			return res.status(400).json({ message: "status must be approved, rejected, or unapproved." });
		}

		const profile = await DriverProfile.findOne({ where: { userId: driverId } });
		if (!profile) return res.status(404).json({ message: "Driver profile not found." });

		// Normalise existing entry (handles old flat-string rows)
		const raw = (profile.unlockedServices || {})[serviceKey];
		const existing = (!raw || typeof raw === 'string')
			? { status: raw || 'unapproved', isEnabled: false }
			: { status: raw.status || 'unapproved', isEnabled: raw.isEnabled ?? false };

		const services = { ...(profile.unlockedServices || {}) };
		// When rejecting or reverting to unapproved, force-disable the toggle too
		const newIsEnabled = status === 'approved' ? existing.isEnabled : false;
		services[serviceKey] = { status, isEnabled: newIsEnabled };
		profile.unlockedServices = services;
		profile.changed("unlockedServices", true);
		await profile.save();

		console.log('[Admin] Driver ' + driverId + " service '" + serviceKey + "' -> " + status);
		res.json({ success: true, driverId, serviceKey, status, isEnabled: newIsEnabled });
	} catch (err) {
		console.error("[adminRoutes] service update:", err.message);
		res.status(500).json({ message: "Server error." });
	}
});

// GET /api/admin/drivers/pending
// Returns all drivers with at least one service in 'pending' state
router.get("/drivers/pending", protect, protectAdmin, async (req, res) => {
	try {
		const { DriverProfile, User } = require("../models");
		const profiles = await DriverProfile.findAll({
			include: [{ model: User, as: "user", attributes: ["id", "name", "email", "phoneNumber"] }],
		});
		const pending = profiles.filter(p => {
			const s = p.unlockedServices || {};
			return Object.values(s).some(v => {
				const status = typeof v === 'string' ? v : v?.status;
				return status === 'pending';
			});
		});
		res.json(pending.map(p => ({
			driverId:        p.userId,
			name:            p.user?.name,
			email:           p.user?.email,
			phone:           p.user?.phoneNumber,
			unlockedServices: p.unlockedServices,
			equipmentMedia:   p.equipmentMedia,
		})));
	} catch (err) {
		console.error("[adminRoutes] pending drivers:", err.message);
		res.status(500).json({ message: "Server error." });
	}
});

module.exports = router;
