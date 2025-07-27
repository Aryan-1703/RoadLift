const sequelize = require("../config/database");

const db = {};
db.sequelize = sequelize;

// Import models
db.Driver = require("./driver.model")(sequelize);
db.Job = require("./job.model")(sequelize);
db.User = require("./user.model")(sequelize);
db.Review = require("./review.model")(sequelize);
db.Vehicle = require("./vehicle.model")(sequelize);

// --- Define Relationships ---

// A Job is requested by one User
db.User.hasMany(db.Job, { foreignKey: "userId" });
db.Job.belongsTo(db.User, { foreignKey: "userId" });

// A Job is assigned to one Driver
db.Driver.hasMany(db.Job, { foreignKey: "driverId" });
db.Job.belongsTo(db.Driver, { foreignKey: "driverId" });

db.Review = require("./review.model")(sequelize);

// A Job can have one Review
db.Job.hasOne(db.Review, { foreignKey: "jobId" });
db.Review.belongsTo(db.Job, { foreignKey: "jobId" });

// A User can write many Reviews (as a customer)
db.User.hasMany(db.Review, { foreignKey: "userId" });
db.Review.belongsTo(db.User, { foreignKey: "userId" });

// A Driver can write many Reviews (as a driver)
db.Driver.hasMany(db.Review, { foreignKey: "driverId" });
db.Review.belongsTo(db.Driver, { foreignKey: "driverId" });

// A User can have many Vehicles
db.User.hasMany(db.Vehicle, { foreignKey: "userId" });
db.Vehicle.belongsTo(db.User, { foreignKey: "userId" });

// This creates the vehicleId foreign key in the Jobs table
db.Vehicle.hasMany(db.Job, { foreignKey: "vehicleId" });
db.Job.belongsTo(db.Vehicle, { foreignKey: "vehicleId" });
// ---

module.exports = db;
