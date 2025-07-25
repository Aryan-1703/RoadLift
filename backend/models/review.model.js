const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Review = sequelize.define("Review", {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		// The rating for the driver, given by the customer
		driverRating: {
			type: DataTypes.INTEGER,
			allowNull: true, // Nullable because a driver might rate a user
			validate: {
				min: 1,
				max: 5,
			},
		},
		// The rating for the user, given by the driver
		userRating: {
			type: DataTypes.INTEGER,
			allowNull: true, // Nullable because a user might rate a driver
			validate: {
				min: 1,
				max: 5,
			},
		},
		comment: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		// To know who wrote the review (user or driver)
		authorRole: {
			type: DataTypes.ENUM("user", "driver"),
			allowNull: false,
		},
	});

	return Review;
};
