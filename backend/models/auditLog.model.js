"use strict";
const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const AuditLog = sequelize.define(
		"AuditLog",
		{
			id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
			adminId:   { type: DataTypes.INTEGER, allowNull: false },
			adminName: { type: DataTypes.STRING,  allowNull: false },
			// e.g. "user.suspend", "service.approve", "job.cancel", "job.status_override",
			//      "job.refund", "user.update", "setting.update", "job.reassign", "service.bulk_approve"
			action:     { type: DataTypes.STRING(100), allowNull: false },
			targetType: { type: DataTypes.STRING(50),  allowNull: true  }, // "User", "Job", "Setting"
			targetId:   { type: DataTypes.STRING(50),  allowNull: true  },
			details:    { type: DataTypes.JSONB,        allowNull: true  },
		},
		{
			tableName: "AdminAuditLogs",
			updatedAt: false,
		},
	);
	return AuditLog;
};
