require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
app.use(express.json());

// --- Database Connection ---
const sequelize = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		port: process.env.PORT,
		dialect: "postgres",
		logging: console.log,
	}
);

// --- Models ---
// We define our models here to keep it simple for now
const Driver = sequelize.define("Driver", {
	name: DataTypes.STRING,
	isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
	// GeoJSON format for location with SRID 4326 (standard for GPS)
	currentLocation: DataTypes.GEOMETRY("POINT", 4326),
});

const Job = sequelize.define("Job", {
	status: { type: DataTypes.STRING, defaultValue: "pending" }, // e.g., pending, assigned, completed
	customerLocation: DataTypes.GEOMETRY("POINT", 4326),
});

// --- API Routes ---
// GET all active drivers
app.get("/api/drivers/active", async (req, res) => {
	try {
		const activeDrivers = await Driver.findAll({ where: { isActive: true } });
		res.json(activeDrivers);
	} catch (error) {
		console.error("Error fetching active drivers:", error);
		res.status(500).send("Server Error");
	}
});

// POST to create a new job AND find the nearest driver
app.post("/api/jobs", async (req, res) => {
	try {
		const { lat, lon } = req.body.customerLocation;
		if (!lat || !lon) {
			return res.status(400).send("Latitude and Longitude are required.");
		}

		// 1. Create the new job
		const newJob = await Job.create({
			customerLocation: { type: "Point", coordinates: [lon, lat] }, 
		});
		console.log("New Job Created:", newJob.toJSON());

		// --- NEW LOGIC STARTS HERE ---

		// 2. Find the closest ACTIVE driver to the job's location
		const customerPoint = `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;

		const closestDriver = await Driver.findOne({
			where: {
				isActive: true, // Only search for drivers who are online
			},
			attributes: {
				// We want all driver attributes, plus the calculated distance
				include: [
					[
						// Use sequelize.fn to call the PostGIS ST_Distance function
						sequelize.fn(
							"ST_Distance",
							sequelize.col("currentLocation"),
							sequelize.literal(customerPoint)
						),
						"distance",
					],
				],
			},
			order: [
				// Order the results by the calculated distance, ascending
				sequelize.col("distance"), // The alias we just created
			],
			limit: 1, // We only want the single closest driver
		});

		// --- NEW LOGIC ENDS HERE ---

		if (closestDriver) {
			console.log("Found closest driver:", closestDriver.toJSON());
			// In a real app, you would now:
			// 1. Notify this driver via WebSockets or push notification.
			// 2. Temporarily assign the job to them, awaiting their acceptance.
			// 3. Update the job status to 'assigned'.
			res.status(201).json({
				message: "Job created and nearest driver found.",
				job: newJob,
				assignedDriver: closestDriver,
			});
		} else {
			console.log("No active drivers found for this job.");
			// Keep the job as 'pending'
			res.status(201).json({
				message: "Job created, but no active drivers are currently available.",
				job: newJob,
				assignedDriver: null,
			});
		}
	} catch (error) {
		console.error("Error creating job or finding driver:", error);
		res.status(500).send("Server Error");
	}
});

// --- Start Server ---
const PORT = process.env.PORT || 8001;

// Sync models and start server
sequelize
	.authenticate()
	.then(() => {
		console.log("Database connected...");
		return sequelize.sync({ force: true });
	})
	.then(async () => {
		// Let's add some fake drivers for testing!
		await Driver.destroy({ where: {} }); // Clear old drivers
		console.log("Creating test drivers...");
		await Driver.create({
			name: "John D.",
			isActive: true,
			currentLocation: { type: "Point", coordinates: [-74.006, 40.7128] },
		}); // New York City (closest)
		await Driver.create({
			name: "Jane S.",
			isActive: true,
			currentLocation: { type: "Point", coordinates: [-73.935242, 40.73061] },
		}); // NYC nearby (2nd closest)
		await Driver.create({
			name: "Mike R.",
			isActive: true,
			currentLocation: { type: "Point", coordinates: [-118.2437, 34.0522] },
		}); // Los Angeles (far away)
		await Driver.create({
			name: "Bob T.",
			isActive: false,
			currentLocation: { type: "Point", coordinates: [-74.005, 40.7118] },
		}); // Inactive but very close
		console.log("Test drivers created.");

		app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
	})
	.catch(err => {
		console.error("❌ Sequelize Connection Error:");
		console.error(err); // Full error stack
	});
