const { DataTypes } = require("sequelize");

module.exports = sequelize => {
	const Job = sequelize.define("Job", {
		status: { type: DataTypes.STRING, defaultValue: "pending" },
		customerLocation: DataTypes.GEOMETRY("POINT", 4326),
	});
	return Job;
};
