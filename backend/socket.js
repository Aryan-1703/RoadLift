const { Server } = require("socket.io");

const io = new Server({
	cors: {
		origin: "*", // Allow all origins for development
		methods: ["GET", "POST", "PUT"],
	},
});

// Export the single instance
module.exports = io;
