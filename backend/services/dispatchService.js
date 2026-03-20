"use strict";

// Maps customer serviceType values to the driver's unlockedServices key
const SERVICE_KEY_MAP = {
	'battery-boost': 'battery', battery: 'battery',
	lockout: 'lockout', 'door-lockout': 'lockout',
	'fuel-delivery': 'fuel', fuel: 'fuel',
	'tire-change': 'tire', tire: 'tire',
	towing: null, // no unlock gate for towing yet
};


/**
 * Geo-based staged dispatch service.
 *
 * Stages (index 0–4):
 *   0:  5 km, 120 s, +$0
 *   1: 10 km,  70 s, +$10
 *   2: 15 km,  70 s, +$20
 *   3: 20 km,  70 s, +$30
 *   4: 25 km,  70 s, +$40  → then "no drivers found"
 */

const io = require("../socket");
const driverLocationStore = require("./driverLocationStore");
const { sendPushNotification } = require("../utils/sendPushNotification");
const { User, Job } = require("../models");
const { Op } = require("sequelize");

// ── Stage configuration ────────────────────────────────────────────────────
const STAGES = [
	{ radiusKm: 5,  durationMs: 120_000, travelFee: 0  },
	{ radiusKm: 10, durationMs:  70_000, travelFee: 10 },
	{ radiusKm: 15, durationMs:  70_000, travelFee: 20 },
	{ radiusKm: 20, durationMs:  70_000, travelFee: 30 },
	{ radiusKm: 25, durationMs:  70_000, travelFee: 40 },
];

// jobId (string) → { timer: NodeJS.Timeout | null, notifiedDriverIds: Set<string> }
const activeDispatches = new Map();

// ── Haversine formula ──────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
	const R = 6371;
	const toRad = deg => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── findDriversInRadius ────────────────────────────────────────────────────
// Returns driverIds within radius. If approvedForService is provided, only
// includes drivers whose unlockedServices[approvedForService] === 'approved'.
// approvedDriverIds is a Set<string> from the DB query — passed by runStage.
function findDriversInRadius(lat, lng, radiusKm, excludeIds, approvedDriverIds) {
	const allLocations = driverLocationStore.getAll();
	const result = [];
	for (const [driverId, loc] of allLocations.entries()) {
		if (excludeIds.has(driverId)) continue;
		if (approvedDriverIds && !approvedDriverIds.has(driverId)) continue;
		if (haversineKm(lat, lng, loc.lat, loc.lng) <= radiusKm) {
			result.push(driverId);
		}
	}
	return result;
}

// ── stopDispatch ───────────────────────────────────────────────────────────
function stopDispatch(jobId) {
	const state = activeDispatches.get(String(jobId));
	if (state) {
		clearTimeout(state.timer);
		activeDispatches.delete(String(jobId));
		console.log(`[Dispatch] Stopped dispatch for job ${jobId}`);
	}
}

// ── runStage ───────────────────────────────────────────────────────────────
async function runStage(jobId, stageIndex, jobMeta) {
	try {
		// Guard: job may have been accepted / cancelled between timer fires
		const job = await Job.findByPk(jobId, { attributes: ["id", "status"] });
		if (!job || job.status !== "pending") {
			stopDispatch(jobId);
			return;
		}

		const stage = STAGES[stageIndex];
		const state = activeDispatches.get(String(jobId));
		if (!state) return; // stopDispatch was called

		// Build set of drivers approved for this service type
		const serviceKey = SERVICE_KEY_MAP[jobMeta.serviceType] || null;
		let approvedDriverIds = null;
		if (serviceKey) {
			const { DriverProfile } = require('../models');
			const approvedProfiles = await DriverProfile.findAll({ attributes: ['userId', 'unlockedServices'] });
			approvedDriverIds = new Set(
				approvedProfiles
					.filter(p => {
						const raw = (p.unlockedServices || {})[serviceKey];
						// Handle both old flat-string format and new {status,isEnabled} format
						const svc = (!raw || typeof raw === 'string')
							? { status: raw || 'unapproved', isEnabled: false }
							: { status: raw.status || 'unapproved', isEnabled: raw.isEnabled ?? false };
						return svc.status === 'approved' && svc.isEnabled === true;
					})
					.map(p => String(p.userId))
			);
		}

		const currentPrice = jobMeta.basePrice + stage.travelFee;

		// ── Update dispatch tracking fields in DB (non-fatal if columns missing) ──
		try {
			await Job.update(
				{ dispatchStage: stageIndex, currentRadius: stage.radiusKm, currentPrice },
				{ where: { id: jobId } },
			);
		} catch (dbErr) {
			console.warn(`[Dispatch] DB update failed for job ${jobId} (columns may not exist yet):`, dbErr.message);
		}

		// ── Always notify the customer so they see live feedback ──────────────
		// Stage 0 = "searching started", stage 1+ = "expanding radius"
		const customerEvent = stageIndex === 0 ? "job-search-started" : "job-expanding-radius";
		io.to(String(jobMeta.userId)).emit(customerEvent, {
			jobId:        String(jobId),
			stage:        stageIndex,
			radiusKm:     stage.radiusKm,
			travelFee:    stage.travelFee,
			currentPrice,
			message:      stageIndex === 0
				? `Searching for providers within ${stage.radiusKm} km...`
				: `Expanding search to ${stage.radiusKm} km radius...`,
		});

		// ── Find new drivers in this radius ───────────────────────────────────
		const newDriverIds = findDriversInRadius(
			jobMeta.lat,
			jobMeta.lng,
			stage.radiusKm,
			state.notifiedDriverIds,
		);

		if (newDriverIds.length > 0) {
			// Notify individual drivers that have a known location
			for (const driverId of newDriverIds) {
				state.notifiedDriverIds.add(driverId);
				io.to(driverId).emit("new-job-available", {
					jobId:     String(jobId),
					radiusKm:  stage.radiusKm,
					travelFee: stage.travelFee,
				});
			}
			// Push notifications for those drivers
			const drivers = await User.findAll({
				where: {
					id:        { [Op.in]: newDriverIds.map(Number) },
					role:      "DRIVER",
					isActive:  true,
					pushToken: { [Op.ne]: null },
				},
				attributes: ["id", "pushToken"],
			});
			for (const driver of drivers) {
				sendPushNotification(driver.pushToken, { id: jobId, serviceType: jobMeta.serviceType }).catch(() => {});
			}
		} else {
			// No location data for nearby drivers → broadcast to all active drivers
			io.to("drivers").emit("new-job-available", {
				jobId:     String(jobId),
				radiusKm:  stage.radiusKm,
				travelFee: stage.travelFee,
			});

			// Push notify all active drivers not already notified
			const allDrivers = await User.findAll({
				where: { role: "DRIVER", isActive: true, pushToken: { [Op.ne]: null } },
				attributes: ["id", "pushToken"],
			});
			// Only push-notify drivers approved for this service
			const pushApproved = approvedDriverIds
				? allDrivers.filter(d => approvedDriverIds.has(String(d.id)))
				: allDrivers;
			for (const driver of pushApproved) {
				const id = String(driver.id);
				if (!state.notifiedDriverIds.has(id)) {
					state.notifiedDriverIds.add(id);
					sendPushNotification(driver.pushToken, { id: jobId, serviceType: jobMeta.serviceType }).catch(() => {});
				}
			}
		}

		// ── Schedule next stage or fire no-driver-found ───────────────────────
		const nextStageIndex = stageIndex + 1;

		const timer = setTimeout(async () => {
			try {
				if (nextStageIndex < STAGES.length) {
					await runStage(jobId, nextStageIndex, jobMeta);
				} else {
					// All 5 stages exhausted — cancel job and notify customer
					stopDispatch(jobId);
					const finalJob = await Job.findByPk(jobId, { attributes: ["id", "status"] });
					if (finalJob && finalJob.status === "pending") {
						await Job.update({ status: "cancelled" }, { where: { id: jobId } });
						io.to(String(jobMeta.userId)).emit("job-no-driver-found", {
							jobId:   String(jobId),
							message: "No drivers are available in your area right now. Please try again.",
						});
						console.log(`[Dispatch] No drivers found for job ${jobId} — cancelled.`);
					}
				}
			} catch (err) {
				console.error(`[Dispatch] Error in stage ${nextStageIndex} for job ${jobId}:`, err.message);
			}
		}, stage.durationMs);

		state.timer = timer;
		console.log(`[Dispatch] Job ${jobId} — stage ${stageIndex}, radius ${stage.radiusKm} km, next stage in ${stage.durationMs / 1000}s`);

	} catch (err) {
		console.error(`[Dispatch] runStage error for job ${jobId} stage ${stageIndex}:`, err.message);
	}
}

// ── startDispatch ──────────────────────────────────────────────────────────
/**
 * Entry point — called right after a new job is created.
 * @param {object} job     Sequelize Job instance
 * @param {number} pickupLat  Already-parsed latitude (avoids PostGIS WKB parsing)
 * @param {number} pickupLng  Already-parsed longitude
 */
async function startDispatch(job, pickupLat, pickupLng) {
	const jobId = String(job.id);

	// Use the explicitly passed floats (most reliable).
	// Fall back to geometry field if called without them (backwards compat).
	let lat = pickupLat;
	let lng = pickupLng;

	if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
		const coords = job.pickupLocation?.coordinates; // [lng, lat] in GeoJSON
		if (!coords) {
			// No coordinates at all — one-time broadcast and give up
			console.warn(`[Dispatch] Job ${jobId}: no pickup coordinates — falling back to broadcast.`);
			io.to("drivers").emit("new-job-available", { jobId: String(jobId) });
			io.to(String(job.userId)).emit("job-search-started", {
				jobId:     String(jobId),
				stage:     0,
				radiusKm:  5,
				travelFee: 0,
				currentPrice: job.estimatedCost ? parseFloat(String(job.estimatedCost)) : 0,
				message:   "Searching for providers...",
			});
			return;
		}
		[lng, lat] = coords;
	}

	const basePrice = job.estimatedCost ? parseFloat(String(job.estimatedCost)) : 0;

	const jobMeta = {
		lat,
		lng,
		userId:      job.userId,
		basePrice,
		serviceType: job.serviceType,
	};

	activeDispatches.set(jobId, {
		timer:             null,
		notifiedDriverIds: new Set(),
	});

	console.log(`[Dispatch] Starting dispatch for job ${jobId} at [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
	await runStage(jobId, 0, jobMeta);
}

module.exports = { startDispatch, stopDispatch };
