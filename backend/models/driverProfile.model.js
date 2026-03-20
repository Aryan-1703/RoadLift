const { DataTypes } = require("sequelize");

/**
 * DriverProfile — stores driver-specific operational data.
 * Authentication lives in Users table (role = 'DRIVER').
 * One-to-one with User via userId foreign key.
 */
module.exports = sequelize => {
	const DriverProfile = sequelize.define(
		"DriverProfile",
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				unique: true,
				// Must match the EXACT table name in your DB — "Users" not "users"
				references: { model: "Users", key: "id" },
				onDelete: "CASCADE",
				onUpdate: "CASCADE",
			},
			companyName: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			serviceArea: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			licenseNumber: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			vehicleType: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			insuranceNumber: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			// Driver's real-time GPS position (PostGIS POINT)
			currentLocation: {
				type: DataTypes.GEOMETRY("POINT", 4326),
				allowNull: true,
			},
			// Aggregate rating (denormalized for query performance)
			averageRating: {
				type: DataTypes.DECIMAL(3, 2),
				allowNull: true,
				defaultValue: null,
			},
			totalJobsCompleted: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			// Per-service qualification tracking.
		// Each entry: { status: 'unapproved'|'pending'|'approved'|'rejected', isEnabled: boolean }
		// isEnabled is the driver's own on/off toggle — only settable when status === 'approved'.
		unlockedServices: {
			type: DataTypes.JSONB,
			allowNull: false,
			defaultValue: {
				battery: { status: 'unapproved', isEnabled: false },
				lockout:  { status: 'unapproved', isEnabled: false },
				fuel:     { status: 'unapproved', isEnabled: false },
				tire:     { status: 'unapproved', isEnabled: false },
			},
		},
			// URLs of uploaded equipment proof photos/videos per service
			equipmentMedia: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: null,
			},

		},
		{
			// CRITICAL: must be lowercase — this is a new table we created, not Sequelize-generated
			tableName: "driver_profiles",
			indexes: [{ fields: ["userId"] }, { fields: ["licenseNumber"] }],
		},
	);

	return DriverProfile;
};
