// Use https.request with family:4 to force IPv4.
// Node 18's DNS resolver prefers IPv6 by default; Expo's IPv6 address
// (2604:5580:22::...) is unreachable on most networks, causing a timeout.
const https = require("https");

function sendPushNotification(expoPushToken, jobDetails) {
	const body = JSON.stringify({
		to:    expoPushToken,
		sound: "default",
		title: "🚨 New Tow Job!",
		body:  `A ${jobDetails.serviceType} job is nearby. Tap to view.`,
		data: {
			screen: "DriverDashboardScreen",
			jobId:  jobDetails.id,
		},
	});

	const options = {
		hostname: "exp.host",
		path:     "/--/api/v2/push/send",
		method:   "POST",
		family:   4, // Force IPv4 — avoids undici/IPv6 ConnectTimeoutError
		headers: {
			"Accept":         "application/json",
			"Content-Type":   "application/json",
			"Content-Length": Buffer.byteLength(body),
		},
	};

	const req = https.request(options, res => {
		res.resume(); // drain response so socket is released
	});

	req.on("error", err => {
		console.error("Error sending push notification:", err.message);
	});

	req.write(body);
	req.end();
}

module.exports = { sendPushNotification };
