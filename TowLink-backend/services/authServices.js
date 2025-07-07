const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // Corrected from string to require
const { User, Driver } = require("../models");

/**
 * Generic login function for users and drivers.
 * @param {object} credentials - { phoneNumber, password }.
 * @param {object} Model - The Sequelize model to use (User or Driver).
 * @returns {object} - { record, token }
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

async function login(credentials, Model) {
	const { phoneNumber, password } = credentials;

	// 1. Validate input
	if (!phoneNumber || !password) {
		throw new Error("Phone number and password are required.");
	}

	// 2. Find the user/driver by phone number
	const record = await Model.findOne({ where: { phoneNumber } });
	if (!record) {
		// Use a generic error message for security
		throw new Error("Invalid credentials.");
	}

	// 3. Compare the provided password with the stored hash
	const isMatch = await bcrypt.compare(password, record.password);
	if (!isMatch) {
		// Use the same generic error message
		throw new Error("Invalid credentials.");
	}

	// 4. If credentials are valid, generate a new JWT
	const token = jwt.sign(
		{ id: record.id, role: Model.name.toLowerCase() }, // Payload includes role
		process.env.JWT_SECRET,
		{ expiresIn: "30d" }
	);

	// Remove password from the returned object
	const recordData = record.toJSON();
	delete recordData.password;

	return { record: recordData, token };
}

module.exports = {
	register,
	login,
};
