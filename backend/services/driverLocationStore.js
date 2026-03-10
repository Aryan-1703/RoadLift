"use strict";

/**
 * In-memory driver location cache.
 * Keyed by driverId (string) → { lat, lng, updatedAt (ms) }
 * Entries older than STALE_MS are evicted lazily on getAll().
 */

const STALE_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { lat: number, lng: number, updatedAt: number }>} */
const store = new Map();

/**
 * Update (or insert) a driver's last-known location.
 * @param {string|number} driverId
 * @param {number} lat
 * @param {number} lng
 */
function update(driverId, lat, lng) {
	store.set(String(driverId), { lat, lng, updatedAt: Date.now() });
}

/**
 * Remove a driver from the store (called on disconnect / going offline).
 * @param {string|number} driverId
 */
function remove(driverId) {
	store.delete(String(driverId));
}

/**
 * Get all non-stale driver locations.
 * Evicts stale entries as a side-effect.
 * @returns {Map<string, { lat: number, lng: number, updatedAt: number }>}
 */
function getAll() {
	const now = Date.now();
	for (const [id, data] of store.entries()) {
		if (now - data.updatedAt > STALE_MS) {
			store.delete(id);
		}
	}
	return store;
}

/**
 * Get a single driver's location, or null if not found / stale.
 * @param {string|number} driverId
 * @returns {{ lat: number, lng: number, updatedAt: number } | null}
 */
function get(driverId) {
	const entry = store.get(String(driverId));
	if (!entry) return null;
	if (Date.now() - entry.updatedAt > STALE_MS) {
		store.delete(String(driverId));
		return null;
	}
	return entry;
}

module.exports = { update, remove, getAll, get };
