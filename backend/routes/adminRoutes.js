"use strict";

const express = require("express");
const router  = express.Router();
const { protect, protectAdmin } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/adminController");

const auth = [protect, protectAdmin];

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get("/dashboard", ...auth, ctrl.getDashboard);

// ── Drivers ────────────────────────────────────────────────────────────────
router.get("/drivers",                                  ...auth, ctrl.listDrivers);
router.get("/drivers/pending",                          ...auth, ctrl.getPendingApprovals);  // BEFORE /:id
router.post("/drivers/bulk-approve",                    ...auth, ctrl.bulkApproveServices);  // BEFORE /:id
router.get("/drivers/:id",                              ...auth, ctrl.getDriver);
router.patch("/drivers/:id",                            ...auth, ctrl.updateUserProfile);
router.patch("/drivers/:id/status",                     ...auth, ctrl.updateUserStatus);
router.get("/drivers/:id/earnings",                     ...auth, ctrl.getDriverEarnings);
router.patch("/driver/:driverId/service/:serviceType",  ...auth, ctrl.approveService);

// ── Customers ──────────────────────────────────────────────────────────────
router.get("/customers",              ...auth, ctrl.listCustomers);
router.get("/customers/:id",          ...auth, ctrl.getCustomer);
router.patch("/customers/:id",        ...auth, ctrl.updateUserProfile);
router.patch("/customers/:id/status", ...auth, ctrl.updateUserStatus);

// ── Jobs ───────────────────────────────────────────────────────────────────
router.get("/jobs",                  ...auth, ctrl.listJobs);
router.get("/jobs/:id",              ...auth, ctrl.getJob);
router.patch("/jobs/:id/cancel",     ...auth, ctrl.forceCancelJob);
router.patch("/jobs/:id/status",     ...auth, ctrl.overrideJobStatus);
router.post("/jobs/:id/refund",      ...auth, ctrl.issueRefund);
router.patch("/jobs/:id/reassign",   ...auth, ctrl.reassignJob);

// ── Analytics ──────────────────────────────────────────────────────────────
router.get("/analytics/overview",  ...auth, ctrl.getAnalyticsOverview);
router.get("/analytics/services",  ...auth, ctrl.getServiceBreakdown);

// ── Platform Settings ──────────────────────────────────────────────────────
router.get("/settings",   ...auth, ctrl.getSettings);
router.patch("/settings", ...auth, ctrl.updateSettings);

// ── Export ─────────────────────────────────────────────────────────────────
router.get("/export/:type", ...auth, ctrl.exportData);  // jobs | drivers | customers

// ── Audit Log ──────────────────────────────────────────────────────────────
router.get("/audit-logs", ...auth, ctrl.getAuditLogs);

// ── Admin User Management ──────────────────────────────────────────────────
router.get("/admins",        ...auth, ctrl.listAdmins);
router.post("/admins",       ...auth, ctrl.createAdmin);
router.delete("/admins/:id", ...auth, ctrl.deleteAdmin);

// ── Push Notifications ─────────────────────────────────────────────────────
router.post("/notifications/broadcast", ...auth, ctrl.broadcastNotification);

module.exports = router;
