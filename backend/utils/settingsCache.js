"use strict";

// ── Default values (used when DB row is missing) ──────────────────────────────
const DEFAULT_SETTINGS = {
	platformFee:     0.20,   // decimal — 0.20 = 20%
	searchRadius:    { initial: 5, max: 25, step: 5 },
	pricing: {
		battery: { base: 60, perKm: 2 },
		lockout: { base: 75, perKm: 2 },
		fuel:    { base: 55, perKm: 2 },
		tire:    { base: 65, perKm: 2 },
	},
	cancellationFee: 10,     // dollars
	supportEmail:    "support@roadlift.ca",
	supportPhone:    "+1 (416) 000-0000",
};

// ── In-memory cache ────────────────────────────────────────────────────────────
let _cache     = null;
let _cacheTime = 0;
const TTL_MS   = 60_000; // 1 minute

// ── getSettings — returns merged object (defaults + DB overrides) ─────────────
async function getSettings() {
	if (_cache && Date.now() - _cacheTime < TTL_MS) return _cache;
	try {
		const { Setting } = require("../models");
		const rows  = await Setting.findAll();
		const result = { ...DEFAULT_SETTINGS };
		for (const row of rows) result[row.key] = row.value;
		_cache     = result;
		_cacheTime = Date.now();
		return result;
	} catch (e) {
		console.warn("[Settings] DB read failed, using defaults:", e.message);
		return DEFAULT_SETTINGS;
	}
}

// ── getSetting — returns a single key ─────────────────────────────────────────
async function getSetting(key) {
	const s = await getSettings();
	return s[key] ?? DEFAULT_SETTINGS[key];
}

// ── clearSettingsCache — call after updateSettings so next read hits DB ───────
function clearSettingsCache() {
	_cache     = null;
	_cacheTime = 0;
}

module.exports = { getSetting, getSettings, clearSettingsCache, DEFAULT_SETTINGS };
