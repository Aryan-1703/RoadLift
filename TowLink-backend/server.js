require("dotenv").config();
const express = require("express");
const db = require("./models");

const app = express();
app.use(express.json());

// --- Routes ---
const jobRoutes = require("./routes/jobRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
	res.send("TowLink API is running...");
});

// --- Start Server ---
const PORT = process.env.PORT || 8001;

const startServer = async () => {
	try {
		await db.sequelize.authenticate();
		console.log("Database connected...");

		// Using force: true to reset DB on each start (for development)
		await db.sequelize.sync({ force: true });
		console.log("Database synchronized.");

		app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
	} catch (err) {
		console.log("Error starting server:", err);
	}
};

startServer();
