const vehicleService = require("../services/vehicleService");

/**
 * @desc    Get all vehicles for the logged-in user
 * @route   GET /api/vehicles
 * @access  Private
 */
const getVehicles = async (req, res) => {
	try {
		// req.user.id is attached by our 'protect' middleware
		const vehicles = await vehicleService.getVehicles(req.user.id);
		res.status(200).json(vehicles);
	} catch (error) {
		console.error("Error getting vehicles:", error.message);
		res.status(500).json({ message: "Failed to get vehicles." });
	}
};

/**
 * @desc    Add a new vehicle for the logged-in user
 * @route   POST /api/vehicles
 * @access  Private
 */
const addVehicle = async (req, res) => {
	try {
		const { make, model, year, color, licensePlate } = req.body;

		// Basic validation
		if (!make || !model || !year) {
			return res.status(400).json({ message: "Make, model, and year are required." });
		}

		const newVehicle = await vehicleService.addVehicle(req.user.id, {
			make,
			model,
			year,
			color,
			licensePlate,
		});

		res.status(201).json(newVehicle);
	} catch (error) {
		console.error("Error adding vehicle:", error.message);
		res.status(500).json({ message: "Failed to add vehicle." });
	}
};

/**
 * @desc    Set a vehicle as the default for the logged-in user
 * @route   PUT /api/vehicles/set-default
 * @access  Private
 */
const setAsDefault = async (req, res) => {
	try {
		const { vehicleId } = req.body;
		if (!vehicleId) {
			return res.status(400).json({ message: "Vehicle ID is required." });
		}

		await vehicleService.setAsDefault(req.user.id, vehicleId);
		res.status(200).json({ message: "Default vehicle updated successfully." });
	} catch (error) {
		console.error("Error setting default vehicle:", error.message);
		res.status(500).json({ message: "Failed to set default vehicle." });
	}
};

/**
 * @desc    Delete a vehicle for the logged-in user
 * @route   DELETE /api/vehicles/:vehicleId
 * @access  Private
 */
const deleteVehicle = async (req, res) => {
	try {
		const { vehicleId } = req.params;
		await vehicleService.deleteVehicle(req.user.id, vehicleId);
		res.status(200).json({ message: "Vehicle deleted successfully." });
	} catch (error) {
		console.error("Error deleting vehicle:", error.message);
		// Handle the specific error from the service for unauthorized deletion
		if (error.message.includes("not authorized")) {
			return res.status(403).json({ message: error.message });
		}
		res.status(500).json({ message: "Failed to delete vehicle." });
	}
};

module.exports = {
	getVehicles,
	addVehicle,
	setAsDefault,
	deleteVehicle,
};
