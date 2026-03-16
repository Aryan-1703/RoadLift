const axios = require("axios");

// Expo push tokens always start with "ExponentPushToken[" or "ExpoPushToken["
function isValidExpoPushToken(token) {
	return typeof token === "string" && /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

async function sendPushNotification(expoPushToken, jobDetails) {
	if (!isValidExpoPushToken(expoPushToken)) {
		console.warn("[Push] Skipping — invalid or missing push token:", expoPushToken);
		return;
	}

	try {
		const response = await axios.post(
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
				// Do NOT send Accept-Encoding — Expo occasionally ECONNRESET when
				// the client advertises compression but axios doesn't decompress correctly.
				headers: {
					Accept:         "application/json",
					"Content-Type": "application/json",
				},
				decompress: true,
				timeout:    15000,
			},
		);

		const result = response.data?.data?.[0];
		if (result?.status === "error") {
			console.warn("[Push] Expo error:", result.message, "| details:", result.details);
		}
	} catch (error) {
		console.error("[Push] Failed to send notification:", error.message);
	}
}

module.exports = { sendPushNotification };
