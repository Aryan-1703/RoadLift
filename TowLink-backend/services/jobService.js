const { sequelize, Job, Driver } = require("../models");

async function createJobAndFindDriver(location, userId) {
	const { lat, lon } = location;
	if (!lat || !lon) {
		throw new Error("Latitude and Longitude are required.");
	}

	// 1. Create the new job and associate it with the user
	const newJob = await Job.create({
		customerLocation: { type: "Point", coordinates: [lon, lat] },
		userId: userId, // <-- Assign the userId
	});

	// 2. Find the closest ACTIVE driver
	const customerPoint = `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;
	const closestDriver = await Driver.findOne({
		where: { isActive: true },
		attributes: {
			include: [
				[
					sequelize.fn(
						"ST_Distance",
						sequelize.col("currentLocation"),
						sequelize.literal(customerPoint)
					),
					"distance",
				],
			],
		},
		order: [sequelize.col("distance")],
		limit: 1,
	});

	// 3. Return a structured result
	return {
		job: newJob,
		assignedDriver: closestDriver,
	};
}

module.exports = {
	createJobAndFindDriver,
};
