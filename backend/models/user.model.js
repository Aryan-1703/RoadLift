const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const User = sequelize.define("User", {
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
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
		stripeCustomerId: {
			type: DataTypes.STRING,
			allowNull: true,
		},
	});

	return User;
};
