require("dotenv").config();
const express = require("express");
const http = require("http"); // Required to attach socket.io
const cors = require("cors");

const db = require("./models");
const io = require("./socket"); // Import our shared, singleton socket instance

// --- SERVER AND APP SETUP ---
const app = express();
const server = http.createServer(app);

// Attach the imported io instance to the HTTP server
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

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/utils", utilsRoutes);
app.use("/api/direction", directionsRoutes);

// --- HEALTH CHECK ROUTE ---
app.get("/", (req, res) => {
	res.send("TowLink API is running...");
});

// --- SOCKET.IO CONNECTION LOGIC ---
// This is where we define what happens when a new client connects
io.on("connection", socket => {
	console.log(`Socket connected: ${socket.id}`);

	socket.on("join-room", ({ userId, role }) => {
		console.log(
			`--- JOIN-ROOM EVENT RECEIVED from socket ${socket.id} for User ID: ${userId}, Role: ${role} ---`
		);
		if (userId) {
			socket.join(String(userId)); // Join private room for customer/driver
		}
		if (role === "driver") {
			socket.join("drivers"); // All drivers join shared room
			console.log(`--- Driver ${userId} joined 'drivers' room ---`);
		}
	});

	socket.on("disconnect", () => {
		console.log(`Socket disconnected: ${socket.id}`);
	});
});

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 8001;

const startServer = async () => {
	try {
		await db.sequelize.authenticate();
		console.log("Database connected...");

		// IMPORTANT: { force: true } deletes all your tables on every restart.
		// Good for dev, but switch to { alter: true } soon to preserve data.
		await db.sequelize.sync({ force: true });
		console.log("Database synchronized.");

		// Start the combined HTTP/Socket.IO server
		server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
	} catch (err) {
		console.error("Error starting server:", err); // Use console.error for errors
	}
};

startServer();
