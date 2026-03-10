const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Job = sequelize.define(
		"Job",
		{
			status: {
				type: DataTypes.ENUM(
					"pending",
					"accepted",
					"arrived",       // driver reached customer location
					"in_progress",
					"completed",
					"cancelled",
				),
				defaultValue: "pending",
				allowNull:    false,
			},
			serviceType: {
				type: DataTypes.ENUM(
					"battery-boost",
					"car-lockout",
					"tire-change",
					"towing",
					"fuel-delivery",
					"accident",
				),
				allowNull: false,
			},
			// FK → Users.id (role = CUSTOMER)
			userId: {
				type:       DataTypes.INTEGER,
				allowNull:  false,
				references: { model: "Users", key: "id" },
			},
			// FK → Users.id (role = DRIVER) — null until accepted
			driverId: {
				type:       DataTypes.INTEGER,
				allowNull:  true,
				references: { model: "Users", key: "id" },
			},
			pickupLocation: {
				type:      DataTypes.GEOMETRY("POINT", 4326),
				allowNull: false,
			},
			dropoffLocation: {
				type:      DataTypes.GEOMETRY("POINT", 4326),
				allowNull: true,
			},
			// BUG FIX: store human-readable address so drivers can see it without
			// a reverse-geocode round-trip.  allowNull so existing rows don't break.
			pickupAddress: {
				type:      DataTypes.STRING(500),
				allowNull: true,
			},
			estimatedCost: {
				type:      DataTypes.DECIMAL(10, 2),
				allowNull: true,
			},
			finalCost: {
				type:      DataTypes.DECIMAL(10, 2),
				allowNull: true,
			},
			notes: {
				type:      DataTypes.TEXT,
				allowNull: true,
			},
			paymentMethodId: {
				type:      DataTypes.STRING,
				allowNull: true,
			},
			paymentIntentId: {
				type:      DataTypes.STRING,
				allowNull: true,
			},
			vehicleId: {
				type:      DataTypes.INTEGER,
				allowNull: true,
			},
			// Dispatch tracking fields
			dispatchStage: {
				type:         DataTypes.INTEGER,
				allowNull:    true,
				defaultValue: 0,
			},
			currentRadius: {
				type:         DataTypes.INTEGER,
				allowNull:    true,
				defaultValue: 5,
			},
			currentPrice: {
				type:      DataTypes.DECIMAL(10, 2),
				allowNull: true,
			},
		},
		{
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
