const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	return sequelize.define("Message", {
		id: {
			type:          DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey:    true,
		},
		jobId: {
			type:      DataTypes.INTEGER,
			allowNull: false,
		},
		senderId: {
			type:      DataTypes.INTEGER,
			allowNull: false,
		},
		senderRole: {
			type:      DataTypes.ENUM("CUSTOMER", "DRIVER"),
			allowNull: false,
		},
		text: {
			type:      DataTypes.TEXT,
			allowNull: false,
		},
	});
};
