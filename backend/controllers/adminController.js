"use strict";

const bcrypt = require("bcryptjs");
const { Op, fn, col, literal } = require("sequelize");

// ── helpers ────────────────────────────────────────────────────────────────
function paginate(query) {
	const page  = Math.max(1, parseInt(query.page)  || 1);
	const limit = Math.min(100, parseInt(query.limit) || 20);
	return { limit, offset: (page - 1) * limit, page };
}

function dateRange(query) {
	const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const to   = query.to   ? new Date(query.to)   : new Date();
	to.setHours(23, 59, 59, 999);
	return { from, to };
}

const SERVICE_KEY_MAP = {
	"battery-boost": "battery", battery: "battery",
	lockout: "lockout", "door-lockout": "lockout",
	"fuel-delivery": "fuel", fuel: "fuel",
	"tire-change": "tire", tire: "tire",
};

function normalizeSvc(val) {
	if (!val || typeof val === "string") return { status: val || "unapproved", isEnabled: false };
	return { status: val.status || "unapproved", isEnabled: val.isEnabled ?? false };
}

// Silent audit helper — never throws so it never breaks a request
async function logAudit(req, action, targetType, targetId, details = {}) {
	try {
		const { AuditLog } = require("../models");
		await AuditLog.create({
			adminId:    req.user.id,
			adminName:  req.user.name,
			action,
			targetType: targetType || null,
			targetId:   targetId != null ? String(targetId) : null,
			details,
		});
	} catch (e) {
		console.warn("[AuditLog] failed to write:", e.message);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
async function getDashboard(req, res) {
	try {
		const { User, Job, DriverProfile } = require("../models");

		const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
		const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
		const weekAgo    = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
		const monthAgo   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const [
			totalCustomers, totalDrivers, totalAdmins, activeDrivers,
			jobsToday, jobsWeek, jobsMonth,
			activeJobs, pendingJobs, completedJobs,
			revToday, revWeek, revMonth,
			allProfiles,
		] = await Promise.all([
			User.count({ where: { role: "CUSTOMER", deletedAt: null } }),
			User.count({ where: { role: "DRIVER",   deletedAt: null } }),
			User.count({ where: { role: "ADMIN",    deletedAt: null } }),
			User.count({ where: { role: "DRIVER", isActive: true, deletedAt: null } }),

			Job.count({ where: { status: { [Op.ne]: "cancelled" }, createdAt: { [Op.between]: [todayStart, todayEnd] } } }),
			Job.count({ where: { status: { [Op.ne]: "cancelled" }, createdAt: { [Op.gte]: weekAgo  } } }),
			Job.count({ where: { status: { [Op.ne]: "cancelled" }, createdAt: { [Op.gte]: monthAgo } } }),

			Job.count({ where: { status: { [Op.in]: ["accepted", "arrived", "in_progress"] } } }),
			Job.count({ where: { status: "pending" } }),
			Job.count({ where: { status: "completed" } }),

			Job.sum("finalCost", { where: { status: "completed", updatedAt: { [Op.between]: [todayStart, todayEnd] } } }),
			Job.sum("finalCost", { where: { status: "completed", updatedAt: { [Op.gte]: weekAgo  } } }),
			Job.sum("finalCost", { where: { status: "completed", updatedAt: { [Op.gte]: monthAgo } } }),

			DriverProfile.findAll({ attributes: ["unlockedServices"] }),
		]);

		const pendingApprovals = allProfiles.filter(p =>
			Object.values(p.unlockedServices || {}).some(v => {
				const st = typeof v === "string" ? v : v?.status;
				return st === "pending";
			})
		).length;

		const fee = 0.20;
		res.json({
			users: {
				customers:     totalCustomers,
				drivers:       totalDrivers,
				admins:        totalAdmins,
				activeDrivers,
			},
			jobs: {
				today:         jobsToday,
				thisWeek:      jobsWeek,
				thisMonth:     jobsMonth,
				active:        activeJobs,
				awaitingDriver: pendingJobs,
				totalCompleted: completedJobs,
			},
			revenue: {
				today:                +(revToday  || 0).toFixed(2),
				thisWeek:             +(revWeek   || 0).toFixed(2),
				thisMonth:            +(revMonth  || 0).toFixed(2),
				platformFeeToday:     +((revToday  || 0) * fee).toFixed(2),
				platformFeeThisWeek:  +((revWeek   || 0) * fee).toFixed(2),
				platformFeeThisMonth: +((revMonth  || 0) * fee).toFixed(2),
			},
			pendingServiceApprovals: pendingApprovals,
		});
	} catch (err) {
		console.error("[Admin] getDashboard:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────────────────────────────────────

async function listDrivers(req, res) {
	try {
		const { User, DriverProfile } = require("../models");
		const { limit, offset, page } = paginate(req.query);
		const { search, status } = req.query;

		const where = { role: "DRIVER" };
		if (search) {
			where[Op.or] = [
				{ name:        { [Op.iLike]: `%${search}%` } },
				{ email:       { [Op.iLike]: `%${search}%` } },
				{ phoneNumber: { [Op.iLike]: `%${search}%` } },
			];
		}
		if (status === "active")    { where.isActive = true;  where.deletedAt = null; }
		if (status === "inactive")  { where.isActive = false; where.deletedAt = null; }
		if (status === "suspended")   where.deletedAt = { [Op.ne]: null };

		const { count, rows } = await User.findAndCountAll({
			where,
			include: [{ model: DriverProfile, as: "driverProfile", required: false }],
			limit, offset,
			order: [["createdAt", "DESC"]],
		});

		res.json({
			total:   count,
			page,
			pages:   Math.ceil(count / limit),
			drivers: rows.map(u => ({
				id:           u.id,
				name:         u.name,
				email:        u.email,
				phone:        u.phoneNumber,
				isActive:     u.isActive,
				isSuspended:  !!u.deletedAt,
				joinedAt:     u.createdAt,
				stripePayoutsEnabled: u.stripePayoutsEnabled,
				profile: u.driverProfile ? {
					vehicleType:        u.driverProfile.vehicleType,
					licenseNumber:      u.driverProfile.licenseNumber,
					averageRating:      u.driverProfile.averageRating,
					totalJobsCompleted: u.driverProfile.totalJobsCompleted,
					unlockedServices:   Object.fromEntries(
						Object.entries(u.driverProfile.unlockedServices || {}).map(([k, v]) => [k, normalizeSvc(v)])
					),
				} : null,
			})),
		});
	} catch (err) {
		console.error("[Admin] listDrivers:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function getPendingApprovals(req, res) {
	try {
		const { DriverProfile, User } = require("../models");
		const profiles = await DriverProfile.findAll({
			include: [{ model: User, as: "user", attributes: ["id", "name", "email", "phoneNumber"] }],
		});
		const pending = profiles.filter(p =>
			Object.values(p.unlockedServices || {}).some(v => {
				const st = typeof v === "string" ? v : v?.status;
				return st === "pending";
			})
		);
		res.json(pending.map(p => ({
			driverId:         p.userId,
			name:             p.user?.name,
			email:            p.user?.email,
			phone:            p.user?.phoneNumber,
			unlockedServices: Object.fromEntries(
				Object.entries(p.unlockedServices || {}).map(([k, v]) => [k, normalizeSvc(v)])
			),
			equipmentMedia:   p.equipmentMedia || {},
		})));
	} catch (err) {
		console.error("[Admin] getPendingApprovals:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function getDriver(req, res) {
	try {
		const { User, DriverProfile, Job, Review } = require("../models");
		const { id } = req.params;

		const user = await User.findOne({
			where:   { id, role: "DRIVER" },
			include: [{ model: DriverProfile, as: "driverProfile" }],
		});
		if (!user) return res.status(404).json({ message: "Driver not found." });

		const [recentJobs, totalEarnings, reviews] = await Promise.all([
			Job.findAll({
				where:   { driverId: id },
				order:   [["createdAt", "DESC"]],
				limit:   10,
				include: [{ model: User, as: "customer", attributes: ["id", "name", "phoneNumber"] }],
			}),
			Job.sum("finalCost", { where: { driverId: id, status: "completed" } }),
			Review.findAll({
				where:   { driverId: id },
				order:   [["createdAt", "DESC"]],
				limit:   10,
				include: [{ model: User, as: "reviewer", attributes: ["id", "name"] }],
			}),
		]);

		res.json({
			id:           user.id,
			name:         user.name,
			email:        user.email,
			phone:        user.phoneNumber,
			isActive:     user.isActive,
			isSuspended:  !!user.deletedAt,
			suspendedAt:  user.deletedAt || null,
			suspensionReason: user.suspensionReason || null,
			joinedAt:     user.createdAt,
			stripeAccountId:      user.stripeAccountId,
			stripePayoutsEnabled: user.stripePayoutsEnabled,
			profile: user.driverProfile ? {
				vehicleType:        user.driverProfile.vehicleType,
				licenseNumber:      user.driverProfile.licenseNumber,
				insuranceNumber:    user.driverProfile.insuranceNumber,
				companyName:        user.driverProfile.companyName,
				serviceArea:        user.driverProfile.serviceArea,
				averageRating:      user.driverProfile.averageRating,
				totalJobsCompleted: user.driverProfile.totalJobsCompleted,
				unlockedServices:   Object.fromEntries(
					Object.entries(user.driverProfile.unlockedServices || {}).map(([k, v]) => [k, normalizeSvc(v)])
				),
				equipmentMedia:     user.driverProfile.equipmentMedia || {},
			} : null,
			totalEarnings: +(totalEarnings || 0).toFixed(2),
			recentJobs: recentJobs.map(j => ({
				id:          j.id,
				status:      j.status,
				serviceType: j.serviceType,
				finalCost:   j.finalCost ? +parseFloat(j.finalCost).toFixed(2) : null,
				customer:    j.customer?.name || null,
				createdAt:   j.createdAt,
			})),
			reviews: reviews.map(r => ({
				id:        r.id,
				rating:    r.rating,
				comment:   r.comment,
				reviewer:  r.reviewer?.name || null,
				createdAt: r.createdAt,
			})),
		});
	} catch (err) {
		console.error("[Admin] getDriver:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// PATCH /api/admin/driver/:driverId/service/:serviceType
async function approveService(req, res) {
	try {
		const { DriverProfile, User } = require("../models");
		const { driverId, serviceType } = req.params;
		const { status } = req.body;

		const serviceKey = SERVICE_KEY_MAP[serviceType];
		if (!serviceKey)
			return res.status(400).json({ message: "Invalid service type." });
		if (!["approved", "rejected", "unapproved"].includes(status))
			return res.status(400).json({ message: "status must be approved, rejected, or unapproved." });

		const profile = await DriverProfile.findOne({ where: { userId: driverId } });
		if (!profile) return res.status(404).json({ message: "Driver profile not found." });

		// Get driver name for audit
		const driver = await User.findByPk(driverId, { attributes: ["name"] });

		const newIsEnabled = status === "approved";
		const services       = { ...(profile.unlockedServices || {}) };
		services[serviceKey] = { status, isEnabled: newIsEnabled };
		profile.unlockedServices = services;
		profile.changed("unlockedServices", true);
		await profile.save();

		await logAudit(req, "service." + status, "User", driverId, {
			serviceType: serviceKey,
			driverName:  driver?.name,
		});

		res.json({ success: true, driverId, serviceKey, status, isEnabled: newIsEnabled });
	} catch (err) {
		console.error("[Admin] approveService:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// PATCH /api/admin/drivers/:id  or  /api/admin/customers/:id
// Body: { name, email, phoneNumber }  — for drivers also: { vehicleType, licenseNumber, companyName, serviceArea }
async function updateUserProfile(req, res) {
	try {
		const { User, DriverProfile } = require("../models");
		const { id } = req.params;
		const { name, email, phoneNumber, vehicleType, licenseNumber, companyName, serviceArea } = req.body;

		const user = await User.findByPk(id);
		if (!user) return res.status(404).json({ message: "User not found." });

		// Check uniqueness if changing email/phone
		if (email && email !== user.email) {
			const exists = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
			if (exists) return res.status(409).json({ message: "Email already in use." });
		}
		if (phoneNumber && phoneNumber !== user.phoneNumber) {
			const exists = await User.findOne({ where: { phoneNumber, id: { [Op.ne]: id } } });
			if (exists) return res.status(409).json({ message: "Phone number already in use." });
		}

		const updates = {};
		if (name)        updates.name        = name;
		if (email)       updates.email       = email;
		if (phoneNumber) updates.phoneNumber = phoneNumber;
		await user.update(updates);

		// Driver profile fields
		if (user.role === "DRIVER" && (vehicleType || licenseNumber || companyName || serviceArea)) {
			const profile = await DriverProfile.findOne({ where: { userId: id } });
			if (profile) {
				const pUpdates = {};
				if (vehicleType)    pUpdates.vehicleType    = vehicleType;
				if (licenseNumber)  pUpdates.licenseNumber  = licenseNumber;
				if (companyName)    pUpdates.companyName    = companyName;
				if (serviceArea)    pUpdates.serviceArea    = serviceArea;
				await profile.update(pUpdates);
			}
		}

		await logAudit(req, "user.update", "User", id, { changes: { ...updates } });
		res.json({ success: true, id: user.id });
	} catch (err) {
		console.error("[Admin] updateUserProfile:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Update User Status
// ─────────────────────────────────────────────────────────────────────────────
async function updateUserStatus(req, res) {
	try {
		const { User } = require("../models");
		const { id }    = req.params;
		const { action, reason } = req.body;

		const user = await User.findByPk(id);
		if (!user) return res.status(404).json({ message: "User not found." });
		if (String(id) === String(req.user.id))
			return res.status(400).json({ message: "You cannot modify your own account." });

		switch (action) {
			case "suspend":
				user.deletedAt        = new Date();
				user.isActive         = false;
				user.suspensionReason = reason || null;
				break;
			case "unsuspend":
				user.deletedAt        = null;
				user.suspensionReason = null;
				break;
			case "activate":
				user.isActive = true;
				break;
			case "deactivate":
				user.isActive = false;
				break;
			default:
				return res.status(400).json({ message: "action must be suspend, unsuspend, activate, or deactivate." });
		}

		await user.save();
		await logAudit(req, "user." + action, "User", id, {
			name:   user.name,
			role:   user.role,
			reason: reason || null,
		});

		res.json({ success: true, id: user.id, isActive: user.isActive, isSuspended: !!user.deletedAt });
	} catch (err) {
		console.error("[Admin] updateUserStatus:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────

async function listCustomers(req, res) {
	try {
		const { User, Job } = require("../models");
		const { limit, offset, page } = paginate(req.query);
		const { search, status } = req.query;

		const where = { role: "CUSTOMER" };
		if (search) {
			where[Op.or] = [
				{ name:        { [Op.iLike]: `%${search}%` } },
				{ email:       { [Op.iLike]: `%${search}%` } },
				{ phoneNumber: { [Op.iLike]: `%${search}%` } },
			];
		}
		if (status === "active")    where.deletedAt = null;
		if (status === "suspended") where.deletedAt = { [Op.ne]: null };

		const { count, rows } = await User.findAndCountAll({
			where, limit, offset,
			order: [["createdAt", "DESC"]],
		});

		const ids = rows.map(u => u.id);
		const jobCounts = ids.length
			? await Job.findAll({
				where:      { userId: { [Op.in]: ids } },
				attributes: ["userId", [fn("COUNT", col("id")), "count"]],
				group:      ["userId"],
				raw:        true,
			})
			: [];
		const jcMap = Object.fromEntries(jobCounts.map(j => [j.userId, parseInt(j.count)]));

		res.json({
			total:     count,
			page,
			pages:     Math.ceil(count / limit),
			customers: rows.map(u => ({
				id:          u.id,
				name:        u.name,
				email:       u.email,
				phone:       u.phoneNumber,
				isSuspended: !!u.deletedAt,
				joinedAt:    u.createdAt,
				totalJobs:   jcMap[u.id] || 0,
				stripeCustomerId: u.stripeCustomerId,
			})),
		});
	} catch (err) {
		console.error("[Admin] listCustomers:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function getCustomer(req, res) {
	try {
		const { User, Vehicle, Job } = require("../models");
		const { id } = req.params;

		const user = await User.findOne({
			where:   { id, role: "CUSTOMER" },
			include: [{ model: Vehicle, required: false }],
		});
		if (!user) return res.status(404).json({ message: "Customer not found." });

		const [recentJobs, totalSpent] = await Promise.all([
			Job.findAll({
				where:   { userId: id },
				order:   [["createdAt", "DESC"]],
				limit:   10,
				include: [{ model: User, as: "driver", attributes: ["id", "name", "phoneNumber"], required: false }],
			}),
			Job.sum("finalCost", { where: { userId: id, status: "completed" } }),
		]);

		res.json({
			id:          user.id,
			name:        user.name,
			email:       user.email,
			phone:       user.phoneNumber,
			isSuspended: !!user.deletedAt,
			suspensionReason: user.suspensionReason || null,
			joinedAt:    user.createdAt,
			stripeCustomerId:     user.stripeCustomerId,
			defaultPaymentMethod: user.defaultPaymentMethodId,
			totalSpent:  +(totalSpent || 0).toFixed(2),
			vehicles:    (user.Vehicles || []).map(v => ({
				id:           v.id,
				make:         v.make,
				model:        v.model,
				year:         v.year,
				color:        v.color,
				licensePlate: v.licensePlate,
			})),
			recentJobs: recentJobs.map(j => ({
				id:          j.id,
				status:      j.status,
				serviceType: j.serviceType,
				finalCost:   j.finalCost ? +parseFloat(j.finalCost).toFixed(2) : null,
				driver:      j.driver?.name || null,
				createdAt:   j.createdAt,
			})),
		});
	} catch (err) {
		console.error("[Admin] getCustomer:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────────────────────────────────────

async function listJobs(req, res) {
	try {
		const { Job, User, Vehicle } = require("../models");
		const { limit, offset, page } = paginate(req.query);
		const { status, serviceType, from, to } = req.query;

		const where = {};
		if (status)      where.status      = status;
		if (serviceType) where.serviceType = serviceType;
		if (from || to) {
			const range = dateRange(req.query);
			where.createdAt = { [Op.between]: [range.from, range.to] };
		}

		const { count, rows } = await Job.findAndCountAll({
			where,
			include: [
				{ model: User,    as: "customer", attributes: ["id", "name", "phoneNumber"] },
				{ model: User,    as: "driver",   attributes: ["id", "name", "phoneNumber"], required: false },
				{ model: Vehicle, as: "vehicle",  attributes: ["make", "model", "year"],    required: false },
			],
			limit, offset,
			order: [["createdAt", "DESC"]],
		});

		res.json({
			total: count,
			page,
			pages: Math.ceil(count / limit),
			jobs:  rows.map(j => ({
				id:            j.id,
				status:        j.status,
				serviceType:   j.serviceType,
				estimatedCost: j.estimatedCost ? +parseFloat(j.estimatedCost).toFixed(2) : null,
				currentPrice:  j.currentPrice  ? +parseFloat(j.currentPrice).toFixed(2)  : null,
				finalCost:     j.finalCost      ? +parseFloat(j.finalCost).toFixed(2)     : null,
				pickupAddress: j.pickupAddress,
				dispatchStage: j.dispatchStage,
				customer:      { id: j.customer?.id, name: j.customer?.name, phone: j.customer?.phoneNumber },
				driver:        j.driver ? { id: j.driver.id, name: j.driver.name, phone: j.driver.phoneNumber } : null,
				vehicle:       j.vehicle ? { make: j.vehicle.make, model: j.vehicle.model, year: j.vehicle.year } : null,
				createdAt:     j.createdAt,
				updatedAt:     j.updatedAt,
			})),
		});
	} catch (err) {
		console.error("[Admin] listJobs:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function getJob(req, res) {
	try {
		const { Job, User, Vehicle, Message, Review } = require("../models");
		const job = await Job.findByPk(req.params.id, {
			include: [
				{ model: User,    as: "customer", attributes: ["id", "name", "email", "phoneNumber"] },
				{ model: User,    as: "driver",   attributes: ["id", "name", "email", "phoneNumber"], required: false },
				{ model: Vehicle, as: "vehicle",  required: false },
				{
					model:   Message,
					as:      "messages",
					include: [{ model: User, as: "sender", attributes: ["id", "name", "role"] }],
				},
				{ model: Review, required: false },
			],
		});
		if (!job) return res.status(404).json({ message: "Job not found." });

		const raw = job.toJSON();
		res.json({
			id:              raw.id,
			status:          raw.status,
			serviceType:     raw.serviceType,
			notes:           raw.notes,
			pickupAddress:   raw.pickupAddress,
			estimatedCost:   raw.estimatedCost  ? +parseFloat(raw.estimatedCost).toFixed(2)  : null,
			currentPrice:    raw.currentPrice   ? +parseFloat(raw.currentPrice).toFixed(2)   : null,
			finalCost:       raw.finalCost      ? +parseFloat(raw.finalCost).toFixed(2)      : null,
			paymentIntentId: raw.paymentIntentId,
			dispatchStage:   raw.dispatchStage,
			currentRadius:   raw.currentRadius,
			isThirdParty:    raw.isThirdParty,
			recipientName:   raw.recipientName,
			recipientPhone:  raw.recipientPhone,
			customer:        raw.customer,
			driver:          raw.driver  || null,
			vehicle:         raw.vehicle || null,
			messages: (raw.messages || []).map(m => ({
				id:         m.id,
				text:       m.text,
				senderRole: m.senderRole,
				sender:     m.sender?.name || null,
				createdAt:  m.createdAt,
			})),
			review:    raw.Review  || null,
			createdAt: raw.createdAt,
			updatedAt: raw.updatedAt,
		});
	} catch (err) {
		console.error("[Admin] getJob:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// PATCH /api/admin/jobs/:id/cancel
async function forceCancelJob(req, res) {
	try {
		const { Job } = require("../models");
		const { stopDispatch } = require("../services/dispatchService");
		const io = require("../socket");

		const job = await Job.findByPk(req.params.id);
		if (!job) return res.status(404).json({ message: "Job not found." });
		if (["completed", "cancelled"].includes(job.status))
			return res.status(400).json({ message: "Job is already " + job.status + "." });

		stopDispatch(job.id);
		await Job.update({ status: "cancelled" }, { where: { id: job.id } });

		io.to(String(job.userId)).emit("job-cancelled", {
			jobId:   String(job.id),
			message: "Your job was cancelled by an administrator.",
		});
		if (job.driverId) {
			io.to(String(job.driverId)).emit("job-cancelled", {
				jobId:   String(job.id),
				message: "Job cancelled by administrator.",
			});
		}

		await logAudit(req, "job.cancel", "Job", job.id, { previousStatus: job.status });
		res.json({ success: true, jobId: job.id });
	} catch (err) {
		console.error("[Admin] forceCancelJob:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// PATCH /api/admin/jobs/:id/status
// Body: { status, reason }
async function overrideJobStatus(req, res) {
	try {
		const { Job } = require("../models");
		const { id } = req.params;
		const { status, reason } = req.body;

		const VALID = ["pending", "accepted", "arrived", "in_progress", "completed", "cancelled"];
		if (!VALID.includes(status))
			return res.status(400).json({ message: "Invalid status. Must be one of: " + VALID.join(", ") });

		const job = await Job.findByPk(id);
		if (!job) return res.status(404).json({ message: "Job not found." });

		const prev = job.status;
		await job.update({ status });

		await logAudit(req, "job.status_override", "Job", id, { from: prev, to: status, reason: reason || null });
		res.json({ success: true, id: job.id, status });
	} catch (err) {
		console.error("[Admin] overrideJobStatus:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// POST /api/admin/jobs/:id/refund
// Body: { amount } — optional, defaults to full finalCost
async function issueRefund(req, res) {
	try {
		const { Job } = require("../models");
		const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
		const { id } = req.params;
		const { amount } = req.body;

		const job = await Job.findByPk(id);
		if (!job) return res.status(404).json({ message: "Job not found." });
		if (!job.paymentIntentId)
			return res.status(400).json({ message: "No payment intent on this job." });

		// Get the PaymentIntent to find the charge
		const pi = await stripe.paymentIntents.retrieve(job.paymentIntentId);
		if (!pi.latest_charge)
			return res.status(400).json({ message: "No charge found on this payment intent." });

		const refundAmount = amount
			? Math.round(parseFloat(amount) * 100)
			: undefined; // undefined = full refund

		const refund = await stripe.refunds.create({
			charge: pi.latest_charge,
			...(refundAmount ? { amount: refundAmount } : {}),
		});

		await logAudit(req, "job.refund", "Job", id, {
			refundId:        refund.id,
			amount:          refund.amount / 100,
			paymentIntentId: job.paymentIntentId,
		});

		res.json({ success: true, refundId: refund.id, amount: refund.amount / 100, status: refund.status });
	} catch (err) {
		console.error("[Admin] issueRefund:", err.message);
		const msg = err.type === "StripeInvalidRequestError" ? err.message : "Refund failed.";
		res.status(500).json({ message: msg });
	}
}

// PATCH /api/admin/jobs/:id/reassign
// Body: { driverId } — optional. If omitted, clears driver and re-queues as pending.
async function reassignJob(req, res) {
	try {
		const { Job, User } = require("../models");
		const { stopDispatch } = require("../services/dispatchService");
		const io = require("../socket");
		const { id } = req.params;
		const { driverId } = req.body;

		const job = await Job.findByPk(id);
		if (!job) return res.status(404).json({ message: "Job not found." });
		if (["completed", "cancelled"].includes(job.status))
			return res.status(400).json({ message: "Cannot reassign a " + job.status + " job." });

		stopDispatch(job.id);
		const prevDriverId = job.driverId;

		if (driverId) {
			const driver = await User.findOne({ where: { id: driverId, role: "DRIVER", isActive: true, deletedAt: null } });
			if (!driver) return res.status(404).json({ message: "Driver not found or unavailable." });

			await job.update({ driverId, status: "accepted", dispatchStage: null });

			// Notify new driver
			io.to(String(driverId)).emit("job-assigned", { jobId: String(job.id) });
		} else {
			// Clear driver and re-queue
			await job.update({ driverId: null, status: "pending", dispatchStage: null, currentRadius: null });
		}

		// Notify old driver if there was one
		if (prevDriverId && prevDriverId !== driverId) {
			io.to(String(prevDriverId)).emit("job-cancelled", {
				jobId:   String(job.id),
				message: "Job has been reassigned by administrator.",
			});
		}

		await logAudit(req, "job.reassign", "Job", id, {
			previousDriverId: prevDriverId,
			newDriverId:      driverId || null,
		});

		res.json({ success: true, jobId: job.id, driverId: driverId || null });
	} catch (err) {
		console.error("[Admin] reassignJob:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/drivers/:id/earnings
async function getDriverEarnings(req, res) {
	try {
		const { Job } = require("../models");
		const { id } = req.params;

		const [byMonth, byService, totals] = await Promise.all([
			// Earnings by month (last 12 months)
			Job.findAll({
				where: { driverId: id, status: "completed" },
				attributes: [
					[fn("DATE_TRUNC", "month", col("updatedAt")), "month"],
					[fn("COUNT", col("id")),     "jobs"],
					[fn("SUM", col("finalCost")), "revenue"],
				],
				group: [fn("DATE_TRUNC", "month", col("updatedAt"))],
				order: [[fn("DATE_TRUNC", "month", col("updatedAt")), "ASC"]],
				raw: true,
			}),
			// Earnings by service type
			Job.findAll({
				where: { driverId: id, status: "completed" },
				attributes: [
					"serviceType",
					[fn("COUNT", col("id")),     "jobs"],
					[fn("SUM", col("finalCost")), "revenue"],
				],
				group: ["serviceType"],
				raw: true,
			}),
			// All-time totals
			Job.findAll({
				where: { driverId: id },
				attributes: [
					[fn("COUNT", col("id")), "total"],
					[fn("SUM", literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), "completed"],
					[fn("SUM", literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), "cancelled"],
					[fn("SUM", literal("CASE WHEN status = 'completed' THEN \"finalCost\" ELSE 0 END")), "totalEarnings"],
				],
				raw: true,
			}),
		]);

		const t = totals[0] || {};
		res.json({
			totals: {
				totalJobs:     +t.total     || 0,
				completed:     +t.completed || 0,
				cancelled:     +t.cancelled || 0,
				totalEarnings: +(+(t.totalEarnings || 0)).toFixed(2),
				driverPayout:  +(+(t.totalEarnings || 0) * 0.80).toFixed(2),
				platformFee:   +(+(t.totalEarnings || 0) * 0.20).toFixed(2),
			},
			byMonth: byMonth.map(m => ({
				month:   m.month,
				jobs:    +m.jobs,
				revenue: +(+(m.revenue || 0)).toFixed(2),
				payout:  +(+(m.revenue || 0) * 0.80).toFixed(2),
			})),
			byService: byService.map(s => ({
				serviceType: s.serviceType,
				jobs:        +s.jobs,
				revenue:     +(+(s.revenue || 0)).toFixed(2),
				payout:      +(+(s.revenue || 0) * 0.80).toFixed(2),
			})),
		});
	} catch (err) {
		console.error("[Admin] getDriverEarnings:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK APPROVALS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/admin/drivers/bulk-approve
// Body: { approvals: [{ driverId, serviceType, status }] }
async function bulkApproveServices(req, res) {
	try {
		const { DriverProfile, User } = require("../models");
		const { approvals } = req.body;
		if (!Array.isArray(approvals) || approvals.length === 0)
			return res.status(400).json({ message: "approvals array is required." });

		const results = [];
		for (const item of approvals) {
			const { driverId, serviceType, status } = item;
			const serviceKey = SERVICE_KEY_MAP[serviceType];
			if (!serviceKey || !["approved", "rejected"].includes(status)) {
				results.push({ driverId, serviceType, success: false, error: "Invalid service or status" });
				continue;
			}

			const profile = await DriverProfile.findOne({ where: { userId: driverId } });
			if (!profile) {
				results.push({ driverId, serviceType, success: false, error: "Profile not found" });
				continue;
			}

			const services = { ...(profile.unlockedServices || {}) };
			services[serviceKey] = { status, isEnabled: status === "approved" };
			profile.unlockedServices = services;
			profile.changed("unlockedServices", true);
			await profile.save();
			results.push({ driverId, serviceType, success: true, status });
		}

		const driver = approvals[0] ? await User.findByPk(approvals[0].driverId, { attributes: ["name"] }) : null;
		await logAudit(req, "service.bulk_approve", "User", null, {
			count:     approvals.length,
			approvals: results,
		});

		res.json({ success: true, results });
	} catch (err) {
		console.error("[Admin] bulkApproveServices:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

async function getAnalyticsOverview(req, res) {
	try {
		const { Job } = require("../models");
		const { from, to } = dateRange(req.query);

		const [jobsByDay, revenueByDay, totalJobs, completedJobs, cancelledJobs, totalRevenue] = await Promise.all([
			Job.findAll({
				where: { createdAt: { [Op.between]: [from, to] } },
				attributes: [
					[fn("DATE_TRUNC", "day", col("createdAt")), "date"],
					[fn("COUNT", col("id")),                    "total"],
					[fn("SUM", literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), "completed"],
					[fn("SUM", literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), "cancelled"],
				],
				group: [fn("DATE_TRUNC", "day", col("createdAt"))],
				order: [[fn("DATE_TRUNC", "day", col("createdAt")), "ASC"]],
				raw:   true,
			}),
			Job.findAll({
				where: { status: "completed", updatedAt: { [Op.between]: [from, to] } },
				attributes: [
					[fn("DATE_TRUNC", "day", col("updatedAt")), "date"],
					[fn("SUM", col("finalCost")),               "revenue"],
				],
				group: [fn("DATE_TRUNC", "day", col("updatedAt"))],
				order: [[fn("DATE_TRUNC", "day", col("updatedAt")), "ASC"]],
				raw:   true,
			}),
			Job.count({ where: { createdAt: { [Op.between]: [from, to] } } }),
			Job.count({ where: { status: "completed", createdAt: { [Op.between]: [from, to] } } }),
			Job.count({ where: { status: "cancelled", createdAt: { [Op.between]: [from, to] } } }),
			Job.sum("finalCost", { where: { status: "completed", updatedAt: { [Op.between]: [from, to] } } }),
		]);

		res.json({
			range:  { from, to },
			totals: {
				jobs:            totalJobs,
				completed:       completedJobs,
				cancelled:       cancelledJobs,
				revenue:         +(totalRevenue || 0).toFixed(2),
				platformRevenue: +((totalRevenue || 0) * 0.20).toFixed(2),
				completionRate:  totalJobs > 0 ? +((completedJobs / totalJobs) * 100).toFixed(1) : 0,
			},
			jobsByDay:    jobsByDay.map(d => ({
				date:      d.date,
				total:     +d.total,
				completed: +d.completed,
				cancelled: +d.cancelled,
			})),
			revenueByDay: revenueByDay.map(d => ({
				date:    d.date,
				revenue: +(+(d.revenue || 0)).toFixed(2),
			})),
		});
	} catch (err) {
		console.error("[Admin] getAnalyticsOverview:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function getServiceBreakdown(req, res) {
	try {
		const { Job } = require("../models");
		const { from, to } = dateRange(req.query);

		const breakdown = await Job.findAll({
			where: { createdAt: { [Op.between]: [from, to] } },
			attributes: [
				"serviceType",
				[fn("COUNT", col("id")),                                                             "total"],
				[fn("SUM", literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")),             "completed"],
				[fn("SUM", literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")),             "cancelled"],
				[fn("SUM", literal("CASE WHEN status = 'completed' THEN \"finalCost\" ELSE 0 END")), "revenue"],
			],
			group: ["serviceType"],
			raw:   true,
		});

		res.json({
			range:    { from, to },
			services: breakdown.map(s => ({
				serviceType: s.serviceType,
				total:       +s.total,
				completed:   +s.completed,
				cancelled:   +s.cancelled,
				revenue:     +(+(s.revenue || 0)).toFixed(2),
			})),
		});
	} catch (err) {
		console.error("[Admin] getServiceBreakdown:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
	platformFee:    0.20,
	searchRadius:   { initial: 5, max: 50, step: 5 },
	pricing: {
		battery:  { base: 60, perKm: 2 },
		lockout:  { base: 75, perKm: 2 },
		fuel:     { base: 55, perKm: 2 },
		tire:     { base: 65, perKm: 2 },
	},
	cancellationFee: 10,
	supportEmail:    "support@roadlift.ca",
	supportPhone:    "+1 (416) 000-0000",
};

async function getSettings(req, res) {
	try {
		const { Setting } = require("../models");
		const rows = await Setting.findAll();
		const result = { ...DEFAULT_SETTINGS };
		for (const row of rows) result[row.key] = row.value;
		res.json(result);
	} catch (err) {
		console.error("[Admin] getSettings:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function updateSettings(req, res) {
	try {
		const { Setting } = require("../models");
		const updates = req.body; // { key: value, ... }
		if (!updates || typeof updates !== "object")
			return res.status(400).json({ message: "Body must be a key-value object." });

		for (const [key, value] of Object.entries(updates)) {
			await Setting.upsert({ key, value, updatedBy: req.user.name });
		}

		await logAudit(req, "setting.update", "Setting", null, { keys: Object.keys(updates) });
		res.json({ success: true, updated: Object.keys(updates) });
	} catch (err) {
		console.error("[Admin] updateSettings:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT TO CSV
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/export/:type  (jobs | drivers | customers)
async function exportData(req, res) {
	try {
		const { User, Job, DriverProfile, Vehicle } = require("../models");
		const { type } = req.params;
		const { from, to } = dateRange(req.query);

		let rows = [];
		let headers = [];

		if (type === "jobs") {
			headers = ["ID", "Status", "Service", "Customer", "Driver", "Final Cost", "Pickup Address", "Created At"];
			const jobs = await Job.findAll({
				where: { createdAt: { [Op.between]: [from, to] } },
				include: [
					{ model: User, as: "customer", attributes: ["name"] },
					{ model: User, as: "driver",   attributes: ["name"], required: false },
				],
				order: [["createdAt", "DESC"]],
			});
			rows = jobs.map(j => [
				j.id, j.status, j.serviceType,
				j.customer?.name || "",
				j.driver?.name   || "Unassigned",
				j.finalCost ? +parseFloat(j.finalCost).toFixed(2) : "",
				`"${(j.pickupAddress || "").replace(/"/g, '""')}"`,
				new Date(j.createdAt).toISOString(),
			]);
		} else if (type === "drivers") {
			headers = ["ID", "Name", "Email", "Phone", "Status", "Rating", "Jobs Completed", "Payouts Enabled", "Joined At"];
			const drivers = await User.findAll({
				where:   { role: "DRIVER" },
				include: [{ model: DriverProfile, as: "driverProfile", required: false }],
				order:   [["createdAt", "DESC"]],
			});
			rows = drivers.map(u => [
				u.id, u.name, u.email || "", u.phoneNumber,
				u.deletedAt ? "Suspended" : u.isActive ? "Active" : "Inactive",
				u.driverProfile?.averageRating || "",
				u.driverProfile?.totalJobsCompleted || 0,
				u.stripePayoutsEnabled ? "Yes" : "No",
				new Date(u.createdAt).toISOString(),
			]);
		} else if (type === "customers") {
			headers = ["ID", "Name", "Email", "Phone", "Status", "Stripe Customer ID", "Joined At"];
			const customers = await User.findAll({
				where: { role: "CUSTOMER" },
				order: [["createdAt", "DESC"]],
			});
			rows = customers.map(u => [
				u.id, u.name, u.email || "", u.phoneNumber,
				u.deletedAt ? "Suspended" : "Active",
				u.stripeCustomerId || "",
				new Date(u.createdAt).toISOString(),
			]);
		} else {
			return res.status(400).json({ message: "type must be jobs, drivers, or customers." });
		}

		const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename="${type}-${Date.now()}.csv"`);
		res.send(csv);
	} catch (err) {
		console.error("[Admin] exportData:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs?page=&action=&adminId=&from=&to=
async function getAuditLogs(req, res) {
	try {
		const { AuditLog } = require("../models");
		const { limit, offset, page } = paginate(req.query);
		const { action, adminId, from, to } = req.query;

		const where = {};
		if (action)  where.action  = { [Op.iLike]: `%${action}%` };
		if (adminId) where.adminId = adminId;
		if (from || to) {
			const range = dateRange(req.query);
			where.createdAt = { [Op.between]: [range.from, range.to] };
		}

		const { count, rows } = await AuditLog.findAndCountAll({
			where, limit, offset,
			order: [["createdAt", "DESC"]],
		});

		res.json({ total: count, page, pages: Math.ceil(count / limit), logs: rows });
	} catch (err) {
		console.error("[Admin] getAuditLogs:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function listAdmins(req, res) {
	try {
		const { User } = require("../models");
		const admins = await User.findAll({
			where:      { role: "ADMIN" },
			attributes: ["id", "name", "email", "phoneNumber", "isActive", "createdAt"],
			order:      [["createdAt", "ASC"]],
		});
		res.json(admins);
	} catch (err) {
		console.error("[Admin] listAdmins:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function createAdmin(req, res) {
	try {
		const { User } = require("../models");
		const { name, email, phoneNumber, password } = req.body;
		if (!name || !email || !password)
			return res.status(400).json({ message: "name, email, and password are required." });

		const exists = await User.findOne({ where: { email } });
		if (exists) return res.status(409).json({ message: "Email already in use." });

		const hashed = await bcrypt.hash(password, 10);
		const admin  = await User.create({
			name, email,
			phoneNumber: phoneNumber || String(Date.now()),
			password: hashed,
			role: "ADMIN",
		});

		await logAudit(req, "admin.create", "User", admin.id, { name: admin.name, email: admin.email });
		res.status(201).json({ id: admin.id, name: admin.name, email: admin.email });
	} catch (err) {
		console.error("[Admin] createAdmin:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

async function deleteAdmin(req, res) {
	try {
		const { User } = require("../models");
		const { id } = req.params;
		if (String(id) === String(req.user.id))
			return res.status(400).json({ message: "You cannot delete your own admin account." });

		const admin = await User.findOne({ where: { id, role: "ADMIN" } });
		if (!admin) return res.status(404).json({ message: "Admin not found." });

		await admin.update({ deletedAt: new Date(), isActive: false });
		await logAudit(req, "admin.delete", "User", id, { name: admin.name, email: admin.email });
		res.json({ success: true });
	} catch (err) {
		console.error("[Admin] deleteAdmin:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

async function broadcastNotification(req, res) {
	try {
		const { User } = require("../models");
		const { sendPushNotification } = require("../utils/sendPushNotification");
		const io = require("../socket");
		const { title, body, audience } = req.body;

		if (!title || !body || !audience)
			return res.status(400).json({ message: "title, body, and audience are required." });
		if (!["drivers", "customers", "all"].includes(audience))
			return res.status(400).json({ message: "audience must be drivers, customers, or all." });

		const roleFilter =
			audience === "drivers"
				? { role: "DRIVER" }
				: audience === "customers"
					? { role: "CUSTOMER" }
					: { role: { [Op.in]: ["DRIVER", "CUSTOMER"] } };

		const users = await User.findAll({
			where:      { ...roleFilter, isActive: true, deletedAt: null, pushToken: { [Op.ne]: null } },
			attributes: ["id", "pushToken"],
		});

		if (audience === "drivers" || audience === "all") {
			io.to("drivers").emit("admin-broadcast", { title, body });
		}

		let sent = 0;
		for (const u of users) {
			await sendPushNotification(u.pushToken, { title, body, type: "admin-broadcast" }).catch(() => {});
			sent++;
		}

		await logAudit(req, "notification.broadcast", null, null, { title, audience, sent });
		res.json({ success: true, sent });
	} catch (err) {
		console.error("[Admin] broadcastNotification:", err.message);
		res.status(500).json({ message: "Server error." });
	}
}

module.exports = {
	getDashboard,
	listDrivers,
	getPendingApprovals,
	getDriver,
	approveService,
	updateUserProfile,
	updateUserStatus,
	listCustomers,
	getCustomer,
	listJobs,
	getJob,
	forceCancelJob,
	overrideJobStatus,
	issueRefund,
	reassignJob,
	getDriverEarnings,
	bulkApproveServices,
	getAnalyticsOverview,
	getServiceBreakdown,
	getSettings,
	updateSettings,
	exportData,
	getAuditLogs,
	listAdmins,
	createAdmin,
	deleteAdmin,
	broadcastNotification,
};
