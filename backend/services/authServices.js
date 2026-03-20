const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { User, DriverProfile, sequelize } = require("../models");

const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// JWT helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign a JWT containing the user's id and role.
 * @param {{ id: number, role: string }} payload
 * @returns {string} signed JWT
 */
function signToken(payload) {
	return jwt.sign(
		{ id: payload.id, role: payload.role },
		process.env.JWT_SECRET,
		{ expiresIn: "30d" },
	);
}

/**
 * Strip the password field before returning user data to the client.
 * @param {object} userInstance Sequelize User instance
 * @returns {object}
 */
function sanitizeUser(userInstance) {
	const data = userInstance.toJSON();
	delete data.password;
	delete data.deletedAt;
	return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified login — works for CUSTOMER, DRIVER, and ADMIN roles.
 * Uses a single users table lookup, so phone uniqueness is globally enforced.
 *
 * @param {{ phoneNumber: string, password: string }} credentials
 * @returns {{ user: object, token: string }}
 */
async function login({ phoneNumber, email, password }) {
	if ((!phoneNumber && !email) || !password) {
		throw new Error("Phone number and password are required.");
	}

	const { Op } = require("sequelize");
	const whereClause = email ? { email } : { phoneNumber };

	// Single query — no dual-table fallback needed
	const user = await User.findOne({
		where: whereClause,
		include: [
			{
				model: DriverProfile,
				as: "driverProfile",
				required: false, // LEFT JOIN — returns null for customers
			},
		],
	});

	// Use a generic message to avoid leaking whether the phone exists
	if (!user) {
		throw new Error("Invalid credentials.");
	}

	if (user.deletedAt) {
		throw new Error("This account has been deactivated. Please contact support.");
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		throw new Error("Invalid credentials.");
	}

	const token = signToken({ id: user.id, role: user.role });
	return { user: sanitizeUser(user), token };
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new CUSTOMER.
 *
 * @param {{ name: string, phoneNumber: string, email?: string, password: string, vehicle?: object }} data
 * @returns {{ user: object, token: string }}
 */
async function registerCustomer({ name, phoneNumber, email, password }) {
	if (!name || !phoneNumber || !password) {
		throw new Error("Name, phone number, and password are required.");
	}

	await assertPhoneNotTaken(phoneNumber);
	if (email) await assertEmailNotTaken(email);

	const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

	const newUser = await User.create({
		name,
		phoneNumber,
		email: email || null,
		password: hashedPassword,
		role: "CUSTOMER",
	});

	const token = signToken({ id: newUser.id, role: newUser.role });
	return { user: sanitizeUser(newUser), token };
}

/**
 * Register a new DRIVER.
 * Creates the User record AND a linked DriverProfile within a transaction
 * so we never end up with a user without a profile (or vice versa).
 *
 * @param {{ name: string, phoneNumber: string, email?: string, password: string, driverProfile?: object }} data
 * @returns {{ user: object, token: string }}
 */
async function registerDriver({ name, phoneNumber, email, password, driverProfile = {} }) {
	if (!name || !phoneNumber || !password) {
		throw new Error("Name, phone number, and password are required.");
	}

	await assertPhoneNotTaken(phoneNumber);
	if (email) await assertEmailNotTaken(email);

	const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

	const result = await sequelize.transaction(async t => {
		const newUser = await User.create(
			{
				name,
				phoneNumber,
				email: email || null,
				password: hashedPassword,
				role: "DRIVER",
				isActive: false, // drivers start offline
			},
			{ transaction: t },
		);

		// Create the linked driver profile (even if fields are empty — filled in later)
		await DriverProfile.create(
			{
				userId: newUser.id,
				companyName:    driverProfile.companyName    || null,
				serviceArea:    driverProfile.serviceArea    || null,
				licenseNumber:  driverProfile.licenseNumber  || null,
				vehicleType:    driverProfile.vehicleType    || null,
				insuranceNumber: driverProfile.insuranceNumber || null,
			},
			{ transaction: t },
		);

		return newUser;
	});

	// Re-fetch with profile included so response mirrors the login response shape
	const userWithProfile = await User.findByPk(result.id, {
		include: [{ model: DriverProfile, as: "driverProfile" }],
	});

	const token = signToken({ id: result.id, role: result.role });
	return { user: sanitizeUser(userWithProfile), token };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function assertPhoneNotTaken(phoneNumber) {
	const existing = await User.findOne({ where: { phoneNumber } });
	if (existing) {
		throw new Error("An account with this phone number already exists.");
	}
}

async function assertEmailNotTaken(email) {
	const existing = await User.findOne({ where: { email } });
	if (existing) {
		throw new Error("An account with this email address already exists.");
	}
}


// ─────────────────────────────────────────────────────────────────────────────
// Password reset — in-memory token store (replace with Redis in production)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const resetTokenStore = new Map(); // token → { userId, expiresAt }

async function forgotPassword({ email }) {
	if (!email) throw new Error('Email is required.');
	const user = await User.findOne({ where: { email } });
	// Always respond the same to avoid leaking whether an email exists
	if (!user) return { sent: true };

	const token = crypto.randomBytes(32).toString('hex');
	resetTokenStore.set(token, { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 });

	try {
		const nodemailer = require('nodemailer');
		const smtpHost = process.env.SMTP_HOST;
		const smtpUser = process.env.SMTP_USER;
		const smtpPass = process.env.SMTP_PASS;
		const from = process.env.SMTP_FROM || '"RoadLift" <' + smtpUser + '>';
		const code = token.slice(0, 6).toUpperCase();

		if (smtpHost && smtpUser && smtpPass) {
			const transporter = nodemailer.createTransport({
				host: smtpHost,
				port: parseInt(process.env.SMTP_PORT || '587', 10),
				secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
				auth: { user: smtpUser, pass: smtpPass },
			});
			await transporter.sendMail({
				from,
				to: email,
				subject: 'Reset your RoadLift password',
				html: '<p>Your RoadLift password reset code is:</p><h2 style="letter-spacing:4px;">' + code + '</h2><p>Enter this code in the app. Expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>',
			});
		}
	} catch (_) { /* SMTP not configured — token still usable in dev */ }

	const resp = { sent: true };
	if (process.env.NODE_ENV !== 'production') resp.token = token;
	return resp;
}

async function resetPassword({ token, newPassword }) {
	if (!token || !newPassword) throw new Error('Token and new password are required.');
	if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');

	const entry = resetTokenStore.get(token);
	if (!entry) throw new Error('Invalid or expired reset token.');
	if (Date.now() > entry.expiresAt) {
		resetTokenStore.delete(token);
		throw new Error('Reset token has expired. Please request a new one.');
	}

	const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
	await User.update({ password: hashed }, { where: { id: entry.userId } });
	resetTokenStore.delete(token);
	return { success: true };
}

module.exports = {
	login,
	forgotPassword,
	resetPassword,
	registerCustomer,
	registerDriver,
	signToken,
	sanitizeUser,
};
