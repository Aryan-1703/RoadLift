const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Job = sequelize.define("Job", {
		status: {
			type: DataTypes.ENUM(
				"pending",
				"accepted",
				"in_progress",
				"completed",
				"cancelled"
			),
			defaultValue: "pending",
			allowNull: false,
		},
		serviceType: {
			type: DataTypes.ENUM("battery-boost", "car-lockout", "tire-change", "towing"),
			allowNull: false,
		},
		// Renaming this to be consistent with our service logic
		pickupLocation: {
			type: DataTypes.GEOMETRY("POINT", 4326),
			allowNull: false,
		},
		// This will be null for non-towing services
		dropoffLocation: {
			type: DataTypes.GEOMETRY("POINT", 4326),
			allowNull: true,
		},
		estimatedCost: {
			type: DataTypes.DECIMAL(10, 2), // e.g., 99.99
			allowNull: true,
		},
		notes: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
	});

	return Job;
};
