const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Driver } = require("../models");

/**
 * Generic registration function to avoid code duplication.
 * @param {object} data - The user or driver data (name, phoneNumber, password).
 * @param {object} Model - The Sequelize model to use (User or Driver).
 * @returns {object} - { createdRecord, token }
 */
async function register(data, Model) {
	const { name, phoneNumber, password } = data;

	// 1. Validate input
	if (!name || !phoneNumber || !password) {
		throw new Error("All fields are required.");
	}

	// 2. Check if user/driver already exists
	const existingRecord = await Model.findOne({ where: { phoneNumber } });
	if (existingRecord) {
		throw new Error("An account with this phone number already exists.");
	}

	// 3. Hash the password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);

	// 4. Create the new user/driver
	const newRecord = await Model.create({
		name,
		phoneNumber,
		password: hashedPassword, // Store the hashed password
	});

	// 5. Generate a JWT token for immediate login
	const token = jwt.sign(
		{ id: newRecord.id, role: Model.name.toLowerCase() }, // Payload
		process.env.JWT_SECRET, // Secret
		{ expiresIn: "30d" } // Expiration
	);

	// Remove password from the returned object
	const recordData = newRecord.toJSON();
	delete recordData.password;

	return { createdRecord: recordData, token };
}

module.exports = {
	register,
};
