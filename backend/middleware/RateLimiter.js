const rateLimitCache = new Map();

const rateLimiter = options => {
	const {
		windowMs = 60000,
		max = 30,
		message = "Too many requests, please try again later.",
	} = options;

	return (req, res, next) => {
		const ip = req.ip || req.connection.remoteAddress;
		const now = Date.now();

		if (!rateLimitCache.has(ip)) {
			rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
			return next();
		}

		const record = rateLimitCache.get(ip);

		if (now > record.resetTime) {
			record.count = 1;
			record.resetTime = now + windowMs;
			return next();
		}

		if (record.count >= max) {
			return res.status(429).json({ message });
		}

		record.count += 1;
		next();
	};
};

module.exports = rateLimiter;
