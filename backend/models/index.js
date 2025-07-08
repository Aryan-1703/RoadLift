const sequelize = require("../config/database");

const db = {};
db.sequelize = sequelize;

// Import models
db.Driver = require("./driver.model")(sequelize);
db.Job = require("./job.model")(sequelize);
db.User = require("./user.model")(sequelize); // Import the new User model

// --- Define Relationships ---

// A Job is requested by one User
db.User.hasMany(db.Job, { foreignKey: "userId" });
db.Job.belongsTo(db.User, { foreignKey: "userId" });

// A Job is assigned to one Driver
db.Driver.hasMany(db.Job, { foreignKey: "driverId" });
db.Job.belongsTo(db.Driver, { foreignKey: "driverId" });

module.exports = db;
