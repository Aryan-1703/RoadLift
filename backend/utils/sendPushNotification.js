const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function sendPushNotification(expoPushToken, jobDetails) {
	try {
		await fetch("https://exp.host/--/api/v2/push/send", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Accept-encoding": "gzip, deflate",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				to: expoPushToken,
				sound: "default",
				title: "🚨 New Tow Job!",
				body: `A ${jobDetails.serviceType} job is nearby. Tap to view.`,
				data: {
					screen: "DriverDashboardScreen",
					jobId: jobDetails.id,
				},
			}),
		});
	} catch (error) {
		console.error("Error sending push notification:", error);
	}
}

module.exports = { sendPushNotification };
