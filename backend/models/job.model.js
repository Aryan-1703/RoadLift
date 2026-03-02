const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Job = sequelize.define(
		"Job",
		{
			status: {
				type: DataTypes.ENUM(
					"pending",
					"accepted",
					"in_progress",
					"completed",
					"cancelled",
				),
				defaultValue: "pending",
				allowNull: false,
			},
			serviceType: {
				type: DataTypes.ENUM(
					"battery-boost",
					"car-lockout",
					"tire-change",
					"towing",
					"fuel-delivery",
				),
				allowNull: false,
			},
			// FK → Users.id (role = CUSTOMER)
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
			},
			// FK → Users.id (role = DRIVER) — null until accepted
			driverId: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: { model: "Users", key: "id" },
			},
			pickupLocation: {
				type: DataTypes.GEOMETRY("POINT", 4326),
				allowNull: false,
			},
			dropoffLocation: {
				type: DataTypes.GEOMETRY("POINT", 4326),
				allowNull: true,
			},
			estimatedCost: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
			},
			notes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			paymentMethodId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			paymentIntentId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			vehicleId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
		},
		{
			// Must match existing DB table name exactly
			tableName: "Jobs",
			indexes: [
				{ fields: ["status"] },
				{ fields: ["userId"] },
				{ fields: ["driverId"] },
			],
		},
	);

	return Job;
};
