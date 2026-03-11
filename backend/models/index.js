const sequelize = require("../config/database");

const db = {};
db.sequelize = sequelize;

// ── Models ───────────────────────────────────────────────────────────────────
db.User          = require("./user.model")(sequelize);
db.DriverProfile = require("./driverProfile.model")(sequelize);
db.Job           = require("./job.model")(sequelize);
db.Review        = require("./review.model")(sequelize);
db.Vehicle       = require("./vehicle.model")(sequelize);

// ── Associations ──────────────────────────────────────────────────────────────

// User ↔ DriverProfile (1:1)
// A driver user has one profile with operational details.
db.User.hasOne(db.DriverProfile, { foreignKey: "userId", as: "driverProfile" });
db.DriverProfile.belongsTo(db.User, { foreignKey: "userId", as: "user" });

// User (as Customer) → Jobs
// The user who *requested* the job.
db.User.hasMany(db.Job, { foreignKey: "userId", as: "requestedJobs" });
db.Job.belongsTo(db.User, { foreignKey: "userId", as: "customer" });

// User (as Driver) → Jobs
// The user (role=DRIVER) who *accepted* the job.
db.User.hasMany(db.Job, { foreignKey: "driverId", as: "assignedJobs" });
db.Job.belongsTo(db.User, { foreignKey: "driverId", as: "driver" });

// Job ↔ Review (1:1)
db.Job.hasOne(db.Review, { foreignKey: "jobId" });
db.Review.belongsTo(db.Job, { foreignKey: "jobId" });

// User → Reviews (written by customer)
db.User.hasMany(db.Review, { foreignKey: "userId", as: "writtenReviews" });
db.Review.belongsTo(db.User, { foreignKey: "userId", as: "reviewer" });

// User → Reviews (received by driver)
db.User.hasMany(db.Review, { foreignKey: "driverId", as: "receivedReviews" });
db.Review.belongsTo(db.User, { foreignKey: "driverId", as: "reviewedDriver" });

// User → Vehicles (customers own vehicles)
db.User.hasMany(db.Vehicle, { foreignKey: "userId" });
db.Vehicle.belongsTo(db.User, { foreignKey: "userId" });

// Vehicle → Jobs
db.Vehicle.hasMany(db.Job, { foreignKey: "vehicleId", as: "jobs" });
db.Job.belongsTo(db.Vehicle, { foreignKey: "vehicleId", as: "vehicle" });

module.exports = db;
