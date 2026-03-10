"use strict";

/**
 * Geo-based staged dispatch service.
 *
 * Stages (index 0–4):
 *   0: 5 km,  120 s, +$0
 *   1: 10 km,  70 s, +$10
 *   2: 15 km,  70 s, +$20
 *   3: 20 km,  70 s, +$30
 *   4: 25 km,  70 s, +$40  → then "no drivers found"
 *
 * Flow:
 *   1. jobService.createJob() calls startDispatch(job)
 *   2. runStage() finds nearby drivers, sends them socket + push notifications
 *   3. If no acceptance before stage timeout, expand to next stage
 *   4. driverService.acceptJob() calls stopDispatch(jobId) to cancel timers
 *   5. If all stages exhausted, emit job-no-driver-found to customer
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

// ── Per-job dispatch state ─────────────────────────────────────────────────
// jobId (string) → { timer: NodeJS.Timeout, notifiedDriverIds: Set<string> }
const activeDispatches = new Map();

// ── Haversine formula ──────────────────────────────────────────────────────
/**
 * Returns distance in km between two lat/lng points.
 * @param {number} lat1 @param {number} lng1
 * @param {number} lat2 @param {number} lng2
 * @returns {number}
 */
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
/**
 * Returns driver IDs (strings) from the in-memory location store
 * that are within radiusKm of [lat, lng].
 * Skips driver IDs already in excludeIds.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {Set<string>} excludeIds
 * @returns {string[]}
 */
function findDriversInRadius(lat, lng, radiusKm, excludeIds) {
	const allLocations = driverLocationStore.getAll();
	const result = [];
	for (const [driverId, loc] of allLocations.entries()) {
		if (excludeIds.has(driverId)) continue;
		const dist = haversineKm(lat, lng, loc.lat, loc.lng);
		if (dist <= radiusKm) {
			result.push(driverId);
		}
	}
	return result;
}

// ── stopDispatch ───────────────────────────────────────────────────────────
/**
 * Cancel all pending timers for a job (called when a driver accepts).
 * @param {string|number} jobId
 */
function stopDispatch(jobId) {
	const state = activeDispatches.get(String(jobId));
	if (state) {
		clearTimeout(state.timer);
		activeDispatches.delete(String(jobId));
		console.log(`[Dispatch] Stopped dispatch for job ${jobId}`);
	}
}

// ── runStage ───────────────────────────────────────────────────────────────
/**
 * Execute one dispatch stage:
 *   1. Find new drivers within this stage's radius
 *   2. Notify them (socket + push)
 *   3. Update job's dispatchStage, currentRadius, currentPrice in DB
 *   4. Emit job-expanding-radius to the customer
 *   5. Schedule next stage (or no-driver-found)
 *
 * @param {string} jobId
 * @param {number} stageIndex
 * @param {{ lat: number, lng: number, userId: number, basePrice: number }} jobMeta
 */
async function runStage(jobId, stageIndex, jobMeta) {
	// Job may have been accepted / cancelled between timer fires
	const job = await Job.findByPk(jobId, { attributes: ["id", "status"] });
	if (!job || job.status !== "pending") {
		stopDispatch(jobId);
		return;
	}

	const stage = STAGES[stageIndex];
	const state = activeDispatches.get(String(jobId));
	if (!state) return; // dispatch was stopped

	const currentPrice = jobMeta.basePrice + stage.travelFee;

	// ── Update job in DB ──────────────────────────────────────────────────
	await Job.update(
		{
			dispatchStage:  stageIndex,
			currentRadius:  stage.radiusKm,
			currentPrice,
		},
		{ where: { id: jobId } },
	);

	// ── Notify customer of radius expansion ───────────────────────────────
	if (stageIndex > 0) {
		io.to(String(jobMeta.userId)).emit("job-expanding-radius", {
			jobId:        String(jobId),
			stage:        stageIndex,
			radiusKm:     stage.radiusKm,
			travelFee:    stage.travelFee,
			currentPrice,
			message:      `Expanding search to ${stage.radiusKm} km radius...`,
		});
	}

	// ── Find new drivers in this radius ───────────────────────────────────
	const newDriverIds = findDriversInRadius(
		jobMeta.lat,
		jobMeta.lng,
		stage.radiusKm,
		state.notifiedDriverIds,
	);

	if (newDriverIds.length > 0) {
		// Socket notification (drivers in "drivers" room who have a location entry)
		for (const driverId of newDriverIds) {
			state.notifiedDriverIds.add(driverId);
			io.to(driverId).emit("new-job-available", {
				jobId:     String(jobId),
				radiusKm:  stage.radiusKm,
				travelFee: stage.travelFee,
			});
		}

		// Push notifications for new drivers in radius who have a push token
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
			sendPushNotification(driver.pushToken, { id: jobId, ...jobMeta }).catch(() => {});
		}
	} else if (stageIndex === 0) {
		// Stage 0: no location data at all — fall back to broadcast to all drivers room
		io.to("drivers").emit("new-job-available", {
			jobId:     String(jobId),
			radiusKm:  stage.radiusKm,
			travelFee: stage.travelFee,
		});

		// Push notify all active drivers
		const allDrivers = await User.findAll({
			where: { role: "DRIVER", isActive: true, pushToken: { [Op.ne]: null } },
			attributes: ["id", "pushToken"],
		});
		for (const driver of allDrivers) {
			state.notifiedDriverIds.add(String(driver.id));
			sendPushNotification(driver.pushToken, { id: jobId, ...jobMeta }).catch(() => {});
		}
	}

	// ── Schedule next stage or no-driver-found ────────────────────────────
	const nextStageIndex = stageIndex + 1;

	const timer = setTimeout(async () => {
		if (nextStageIndex < STAGES.length) {
			await runStage(jobId, nextStageIndex, jobMeta);
		} else {
			// All stages exhausted
			stopDispatch(jobId);

			// Check one more time if job was accepted during last stage
			const finalJob = await Job.findByPk(jobId, { attributes: ["id", "status"] });
			if (finalJob && finalJob.status === "pending") {
				await Job.update({ status: "cancelled" }, { where: { id: jobId } });
				io.to(String(jobMeta.userId)).emit("job-no-driver-found", {
					jobId: String(jobId),
					message: "No drivers are available in your area right now. Please try again.",
				});
				console.log(`[Dispatch] No drivers found for job ${jobId} — cancelled.`);
			}
		}
	}, stage.durationMs);

	// Store updated timer reference
	state.timer = timer;
}

// ── startDispatch ──────────────────────────────────────────────────────────
/**
 * Entry point — called right after a new job is created.
 * Reads the job's pickup location from the DB and kicks off stage 0.
 * @param {import('../models/job.model').Job} job  Sequelize Job instance
 */
async function startDispatch(job) {
	const jobId = String(job.id);

	// Parse pickup coords from PostGIS GeoJSON geometry
	const coords = job.pickupLocation?.coordinates; // [lng, lat]
	if (!coords) {
		console.warn(`[Dispatch] Job ${jobId} has no pickupLocation — falling back to broadcast.`);
		io.to("drivers").emit("new-job-available", { jobId });
		return;
	}

	const [lng, lat] = coords;
	const basePrice = job.estimatedCost ? parseFloat(String(job.estimatedCost)) : 0;

	const jobMeta = {
		lat,
		lng,
		userId:    job.userId,
		basePrice,
		serviceType: job.serviceType,
	};

	activeDispatches.set(jobId, {
		timer:            null, // filled in by runStage
		notifiedDriverIds: new Set(),
	});

	console.log(`[Dispatch] Starting dispatch for job ${jobId} at [${lat}, ${lng}]`);
	await runStage(jobId, 0, jobMeta);
}

module.exports = { startDispatch, stopDispatch };
