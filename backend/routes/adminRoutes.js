"use strict";

const express = require("express");
const router  = express.Router();
const { protect, protectAdmin } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/adminController");

const auth = [protect, protectAdmin];

// ── Dashboard ──────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
router.get("/dashboard", ...auth, ctrl.getDashboard);

// ── Drivers ────────────────────────────────────────────────────────────────
// GET  /api/admin/drivers?page=&limit=&search=&status=active|inactive|suspended
router.get("/drivers",                                ...auth, ctrl.listDrivers);
// GET  /api/admin/drivers/pending  — must come BEFORE /drivers/:id
router.get("/drivers/pending",                        ...auth, ctrl.getPendingApprovals);
// GET  /api/admin/drivers/:id
router.get("/drivers/:id",                            ...auth, ctrl.getDriver);
// PATCH /api/admin/drivers/:id/status  { action: "suspend"|"unsuspend"|"activate"|"deactivate" }
router.patch("/drivers/:id/status",                   ...auth, ctrl.updateUserStatus);
// PATCH /api/admin/driver/:driverId/service/:serviceType  { status: "approved"|"rejected"|"unapproved" }
router.patch("/driver/:driverId/service/:serviceType", ...auth, ctrl.approveService);

// ── Customers ──────────────────────────────────────────────────────────────
// GET  /api/admin/customers?page=&limit=&search=&status=
router.get("/customers",              ...auth, ctrl.listCustomers);
// GET  /api/admin/customers/:id
router.get("/customers/:id",          ...auth, ctrl.getCustomer);
// PATCH /api/admin/customers/:id/status  { action: "suspend"|"unsuspend" }
router.patch("/customers/:id/status", ...auth, ctrl.updateUserStatus);

// ── Jobs ───────────────────────────────────────────────────────────────────
// GET  /api/admin/jobs?status=&serviceType=&from=&to=&page=&limit=
router.get("/jobs",              ...auth, ctrl.listJobs);
// GET  /api/admin/jobs/:id
router.get("/jobs/:id",          ...auth, ctrl.getJob);
// PATCH /api/admin/jobs/:id/cancel
router.patch("/jobs/:id/cancel", ...auth, ctrl.forceCancelJob);

// ── Analytics ──────────────────────────────────────────────────────────────
// GET  /api/admin/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/analytics/overview",  ...auth, ctrl.getAnalyticsOverview);
// GET  /api/admin/analytics/services?from=&to=
router.get("/analytics/services",  ...auth, ctrl.getServiceBreakdown);

// ── Admin User Management ──────────────────────────────────────────────────
// GET    /api/admin/admins
router.get("/admins",        ...auth, ctrl.listAdmins);
// POST   /api/admin/admins  { name, email, phoneNumber, password }
router.post("/admins",       ...auth, ctrl.createAdmin);
// DELETE /api/admin/admins/:id
router.delete("/admins/:id", ...auth, ctrl.deleteAdmin);

// ── Push Notifications ─────────────────────────────────────────────────────
// POST /api/admin/notifications/broadcast  { title, body, audience: "drivers"|"customers"|"all" }
router.post("/notifications/broadcast", ...auth, ctrl.broadcastNotification);

module.exports = router;
