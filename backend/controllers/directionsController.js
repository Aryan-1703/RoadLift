const { getRouteFromGoogle } = "../services/googleMapsService";

const getDirections = async (req, res) => {
	try {
		const { origin, destination } = req.body;

		if (!origin || !destination) {
			return res.status(400).json({ error: "Missing origin or destination" });
		}

		const routeInfo = await getRouteFromGoogle(origin, destination);

		return res.json(routeInfo);
	} catch (error) {
		console.error("Directions Error:", error.message);
		res.status(500).json({ error: "Failed to get directions" });
	}
};

module.exports = {
	getDirections,
};
