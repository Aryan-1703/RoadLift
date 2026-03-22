"use strict";
const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Setting = sequelize.define(
		"Setting",
		{
			id:    { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
			key:   { type: DataTypes.STRING(100), allowNull: false, unique: true },
			value: { type: DataTypes.JSONB, allowNull: false },
			updatedBy: { type: DataTypes.STRING, allowNull: true }, // admin name
		},
		{
			tableName: "AdminSettings",
		},
	);
	return Setting;
};
