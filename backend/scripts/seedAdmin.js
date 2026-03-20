/**
 * Creates the first admin user.
 *
 * Usage:
 *   node backend/scripts/seedAdmin.js
 *
 * Override defaults with env vars:
 *   ADMIN_EMAIL=you@roadlift.ca ADMIN_PASSWORD=SecurePass1 node backend/scripts/seedAdmin.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const db     = require("../models");
const { User } = db;

async function seed() {
	try {
		await db.sequelize.authenticate();
		console.log("Database connected.");

		const email    = process.env.ADMIN_EMAIL    || "admin@roadlift.ca";
		const password = process.env.ADMIN_PASSWORD || "Admin@RoadLift2024!";
		const name     = process.env.ADMIN_NAME     || "Super Admin";
		const phone    = process.env.ADMIN_PHONE    || "0000000000";

		const existing = await User.findOne({ where: { email } });
		if (existing) {
			console.log("Admin already exists:", email, "(id=" + existing.id + ")");
			process.exit(0);
		}

		const hashed = await bcrypt.hash(password, 10);
		const admin  = await User.create({
			name,
			email,
			phoneNumber: phone,
			password: hashed,
			role:     "ADMIN",
			isActive: true,
		});

		console.log("\nAdmin created successfully!");
		console.log("  ID:       ", admin.id);
		console.log("  Name:     ", name);
		console.log("  Email:    ", email);
		console.log("  Password: ", password);
		console.log("\n⚠️  Change this password immediately after first login.\n");
		process.exit(0);
	} catch (err) {
		console.error("Seed failed:", err.message);
		process.exit(1);
	}
}

seed();
