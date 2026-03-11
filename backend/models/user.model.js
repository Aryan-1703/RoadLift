const { DataTypes } = require("sequelize");

/**
 * Unified User model — single source of truth for all authentication.
 * Role distinguishes CUSTOMER vs DRIVER vs ADMIN.
 * Profile-specific fields live in driver_profiles / customer_profiles tables.
 */
module.exports = sequelize => {
	const User = sequelize.define(
		"User",
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: true,
				validate: { isEmail: true },
			},
			// Single phone column — globally unique across ALL roles
			phoneNumber: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			role: {
				// Column is VARCHAR in DB (with CHECK constraint) — using STRING avoids
				// Sequelize trying to ALTER the type to an ENUM on every sync.
				type: DataTypes.STRING(10),
				allowNull: false,
				defaultValue: "CUSTOMER",
				validate: {
					isIn: [["CUSTOMER", "DRIVER", "ADMIN"]],
				},
			},
			// Shared operational fields
			isActive: {
				type: DataTypes.BOOLEAN,
				defaultValue: true,
				allowNull: false,
				comment: "For drivers: online/offline toggle. For customers: account enabled.",
			},
			pushToken: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			// Stripe — customers use stripeCustomerId, drivers use stripeAccountId
			stripeCustomerId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			stripeAccountId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			stripePayoutsEnabled: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			defaultPaymentMethodId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			defaultVehicleId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			// Notification preferences — stored as JSONB
			preferences: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: null,
			},
			// Soft delete / suspension support
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			// CRITICAL: must match your existing DB table name exactly — "Users" not "users"
			tableName: "Users",
			paranoid: false,
			// indexes omitted — already exist in DB from SQL migration
		},
	);

	return User;
};
