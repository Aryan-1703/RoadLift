require("dotenv").config();
const express = require("express");
const db = require("./models");
const cors = require("cors");
const http = require("http");
const io = require("./socket");

const app = express();
const server = http.createServer(app);
io.attach(server);
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
const jobRoutes = require("./routes/jobRoutes");
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");

app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
// --- Socket.IO Connection Logic ---
io.on("connection", socket => {
	console.log(`User connected with socket ID: ${socket.id}`);

	// When a user logs in, they should join a room based on their userId
	socket.on("join-room", userId => {
		socket.join(userId);
		console.log(`Socket ${socket.id} joined room for User ID: ${userId}`);
	});

	socket.on("disconnect", () => {
		console.log(`User disconnected with socket ID: ${socket.id}`);
	});
});

module.exports.io = io;

app.get("/", (req, res) => {
	res.send("TowLink API is running...");
});

// --- Start Server ---
const PORT = process.env.PORT || 8001;

const startServer = async () => {
	try {
		await db.sequelize.authenticate();
		console.log("Database connected...");

		await db.sequelize.sync({ force: true }); // Use { alter: true } in production
		console.log("Database synchronized.");

		server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
	} catch (err) {
		console.log("Error starting server:", err);
	}
};

startServer();
