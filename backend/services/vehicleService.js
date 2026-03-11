const { Vehicle, User } = require("../models");

async function addVehicle(userId, vehicleData) {
	return Vehicle.create({ ...vehicleData, userId });
}

async function getVehicles(userId) {
	return Vehicle.findAll({ where: { userId } });
}

async function setAsDefault(userId, vehicleId) {
	const user = await User.findByPk(userId);
	user.defaultVehicleId = vehicleId;
	await user.save();
	return user;
}

async function deleteVehicle(userId, vehicleId) {
	// Security check: ensure the vehicle belongs to the user
	const vehicle = await Vehicle.findOne({ where: { id: vehicleId, userId: userId } });
	if (!vehicle) {
		throw new Error("Vehicle not found or you are not authorized to delete it.");
	}
	await vehicle.destroy();

	// If this was the user's default vehicle, clear it in the DB
	const user = await User.findByPk(userId);
	if (user && String(user.defaultVehicleId) === String(vehicleId)) {
		// Auto-promote next available vehicle, or clear if none left
		const next = await Vehicle.findOne({ where: { userId } });
		await User.update(
			{ defaultVehicleId: next ? next.id : null },
			{ where: { id: userId } },
		);
	}

	return { message: "Vehicle deleted." };
}

module.exports = { addVehicle, getVehicles, setAsDefault, deleteVehicle };
