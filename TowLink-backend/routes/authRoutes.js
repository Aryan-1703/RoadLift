const express = require("express");
const router = express.Router();
const { registerUser, registerDriver } = require("../controllers/authController");

// @route   POST /api/auth/register/user
// @desc    Register a new user (customer)
// @access  Public
router.post("/register/user", registerUser);

// @route   POST /api/auth/register/driver
// @desc    Register a new driver
// @access  Public
router.post("/register/driver", registerDriver);

// We will add login routes here later
// router.post('/login/user', loginUser);
// router.post('/login/driver', loginDriver);

module.exports = router;
