// Use axios (not native fetch) — Node 18 fetch uses undici which prefers IPv6,
// causing ConnectTimeoutError when Expo's IPv6 address is unreachable.
// axios uses Node's http module which correctly falls back to IPv4.
const axios = require("axios");

async function sendPushNotification(expoPushToken, jobDetails) {
	try {
		await axios.post(
			"https://exp.host/--/api/v2/push/send",
			{
				to:    expoPushToken,
				sound: "default",
				title: "New Job Nearby",
				body:  `A ${jobDetails.serviceType} job is available. Tap to view.`,
				data: {
					screen: "DriverDashboardScreen",
					jobId:  jobDetails.id,
				},
			},
			{
				headers: {
					Accept:           "application/json",
					"Accept-Encoding": "gzip, deflate",
					"Content-Type":   "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Error sending push notification:", error.message);
	}
}

module.exports = { sendPushNotification };
