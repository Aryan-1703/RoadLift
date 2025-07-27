const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Vehicle = sequelize.define("Vehicle", {
		make: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		model: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		year: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		color: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		licensePlate: {
			type: DataTypes.STRING,
			allowNull: true,
		},
	});
	return Vehicle;
};
