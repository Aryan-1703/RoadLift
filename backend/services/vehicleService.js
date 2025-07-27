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
	return { message: "Vehicle deleted." };
}

module.exports = { addVehicle, getVehicles, setAsDefault, deleteVehicle };
