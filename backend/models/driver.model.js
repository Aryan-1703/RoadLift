const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Driver = sequelize.define("Driver", {
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		phoneNumber: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
		currentLocation: DataTypes.GEOMETRY("POINT", 4326),
		pushToken: { type: DataTypes.STRING },
	});
	return Driver;
};
