require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const { Job, User } = require("./models");
const db = require("./models");
const io = require("./socket");

// --- SERVER AND APP SETUP ---
const app = express();
const server = http.createServer(app);

io.attach(server);
app.set("io", io);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const driverRoutes = require("./routes/driverRoutes");
const utilsRoutes = require("./routes/utils");
const directionsRoutes = require("./routes/directionsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const geocodingRoutes = require("./routes/geocodingRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/utils", utilsRoutes);
app.use("/api/direction", directionsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/geocode", geocodingRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/maps", mapsRoutes);
app.use("/api/users", userRoutes);

// --- HEALTH CHECK ---
app.get("/", (req, res) => res.send("RoadLift API is running..."));

// --- SOCKET.IO ---
io.on("connection", socket => {
	console.log(`[Socket] Connected: ${socket.id}`);

	// ── join-room — called once on login to subscribe to personal events ──
	// Frontend: socketClient.ioSocket.emit("join-room", { userId, role })
	socket.on("join-room", ({ userId, role }) => {
		if (!userId) return;
		const userRoom = String(userId);
		socket.join(userRoom);
		console.log(`[Socket] User ${userId} (${role}) joined room '${userRoom}'`);

		if (role === "DRIVER" || role === "driver") {
			socket.join("drivers");
			console.log(`[Socket] Driver ${userId} joined 'drivers' room`);
		}
	});

	// ── join-job — called by both customer and driver after a job is matched ──
	// Frontend (customer): socketClient.emit("join-job", jobId)
	// Frontend (driver):   socketClient.emit("join-job", jobId) after acceptJob
	socket.on("join-job", jobId => {
		const room = `job-${jobId}`;
		socket.join(room);
		console.log(`[Socket] Socket ${socket.id} joined job room '${room}'`);
	});

	// ── driver-location-update — driver sends their GPS position ─────────────
	// We relay it to the customer via their personal room AND the job room.
	socket.on("driver-location-update", async ({ jobId, location }) => {
		if (!jobId || !location) return;

		try {
			const job = await Job.findByPk(jobId, { attributes: ["userId"] });
			if (!job) return;

			const payload = { jobId, location };

			// To customer personal room (userId)
			io.to(String(job.userId)).emit("driver-location-updated", payload);

			// To job room (both customer and driver subscribed after match)
			io.to(`job-${jobId}`).emit("driver-location-updated", payload);
		} catch (err) {
			console.error(`[Socket] Error relaying location for job ${jobId}:`, err.message);
		}
	});

	// ── driver-online / driver-offline — mirror the REST status toggle ───────
	socket.on("driver-online", ({ driverId }) => {
		if (driverId) socket.join("drivers");
	});

	socket.on("driver-offline", ({ driverId }) => {
		socket.leave("drivers");
	});

	socket.on("disconnect", () => {
		console.log(`[Socket] Disconnected: ${socket.id}`);
	});
});

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 8001;

const startServer = async () => {
	try {
		await db.sequelize.authenticate();
		console.log("Database connected...");

		await db.sequelize.sync({ alter: true });
		console.log("Database synchronized.");

		server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
	} catch (err) {
		console.error("Error starting server:", err);
	}
};

startServer();
