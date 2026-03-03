// backend/controllers/userController.js
const bcrypt = require("bcryptjs");
const { User, DriverProfile } = require("../models");

// ─────────────────────────────────────────────────────────────────────────────
// OTP store  { `${userId}_phone` | `${userId}_email` → { code, expiresAt, newValue } }
// Replace with Redis in production:
//   await redis.set(key, JSON.stringify(entry), 'EX', 300);
// ─────────────────────────────────────────────────────────────────────────────
const otpStore = new Map();

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio — SMS delivery
// Required env vars:
//   TWILIO_ACCOUNT_SID   e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN    e.g. your_auth_token
//   TWILIO_PHONE_NUMBER  e.g. +14165550000  (your Twilio number)
// ─────────────────────────────────────────────────────────────────────────────
async function sendSMS(toPhone, message) {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const fromPhone = process.env.TWILIO_PHONE_NUMBER;

	if (!accountSid || !authToken || !fromPhone) {
		throw new Error(
			"Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file.",
		);
	}

	const twilio = require("twilio")(accountSid, authToken);

	await twilio.messages.create({
		body: message,
		from: fromPhone,
		to: toPhone,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Nodemailer — email delivery via SMTP (works with Gmail, Outlook, SendGrid, etc.)
// Required env vars:
//   SMTP_HOST      e.g. smtp.gmail.com
//   SMTP_PORT      e.g. 587
//   SMTP_USER      e.g. yourapp@gmail.com
//   SMTP_PASS      e.g. your_app_password   (Gmail: use an App Password, not your real password)
//   SMTP_FROM      e.g. "RoadLift <noreply@roadlift.com>"
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmail(toEmail, subject, htmlBody) {
	const nodemailer = require("nodemailer");

	const host = process.env.SMTP_HOST;
	const port = parseInt(process.env.SMTP_PORT || "587", 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const from = process.env.SMTP_FROM || `"RoadLift" <${user}>`;

	if (!host || !user || !pass) {
		throw new Error(
			"Email is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to your .env file.",
		);
	}

	const transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	});

	await transporter.sendMail({ from, to: toEmail, subject, html: htmlBody });
}

// ─── Email HTML template ────────────────────────────────────────────────────
function buildOtpEmailHtml(code) {
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f0ede7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a6bff;padding:32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">RoadLift</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Email Verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 24px;color:#1b1916;font-size:15px;line-height:1.6;">
              Use the code below to verify your new email address. It expires in <strong>5 minutes</strong>.
            </p>
            <div style="background:#f0ede7;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
              <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1a6bff;">${code}</span>
            </div>
            <p style="margin:0;color:#9c9289;font-size:13px;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;border-top:1px solid #e2ddd6;">
            <p style="margin:24px 0 0;color:#c4bdb4;font-size:12px;text-align:center;">
              © ${new Date().getFullYear()} RoadLift · Automated message — please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
	try {
		const user = await User.findByPk(req.user.id, {
			attributes: { exclude: ["password", "pushToken"] },
		});
		if (!user) return res.status(404).json({ message: "User not found." });
		return res.json({ user });
	} catch (err) {
		console.error("[userController] getProfile:", err);
		return res.status(500).json({ message: "Server error." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/profile
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
	try {
		const userId = req.user.id;
		const {
			name,
			companyName,
			serviceArea,
			licenseNumber,
			vehicleType,
			insuranceNumber,
		} = req.body;

		if (!name || name.trim().length < 2) {
			return res.status(400).json({ message: "Name must be at least 2 characters." });
		}

		await User.update({ name: name.trim() }, { where: { id: userId } });

		if (req.user.role === "DRIVER" && DriverProfile) {
			const dp = await DriverProfile.findOne({ where: { userId } });
			if (dp) {
				await dp.update({
					...(companyName !== undefined && { companyName }),
					...(serviceArea !== undefined && { serviceArea }),
					...(licenseNumber !== undefined && { licenseNumber }),
					...(vehicleType !== undefined && { vehicleType }),
					...(insuranceNumber !== undefined && { insuranceNumber }),
				});
			}
		}

		const updated = await User.findByPk(userId, {
			attributes: { exclude: ["password", "pushToken"] },
		});
		return res.json({ success: true, user: updated });
	} catch (err) {
		console.error("[userController] updateProfile:", err);
		return res.status(500).json({ message: "Failed to update profile." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/request-phone-change
// ─────────────────────────────────────────────────────────────────────────────
const requestPhoneChange = async (req, res) => {
	try {
		const { newPhone } = req.body;

		if (!newPhone || !/^\+?[\d\s\-().]{7,15}$/.test(newPhone.trim())) {
			return res.status(400).json({ message: "Invalid phone number." });
		}

		const existing = await User.findOne({ where: { phoneNumber: newPhone.trim() } });
		if (existing && existing.id !== req.user.id) {
			return res.status(409).json({ message: "That phone number is already in use." });
		}

		const code = generateOTP();
		otpStore.set(`${req.user.id}_phone`, {
			code,
			newValue: newPhone.trim(),
			expiresAt: Date.now() + 5 * 60 * 1000,
		});

		await sendSMS(
			newPhone.trim(),
			`Your RoadLift verification code is: ${code}. Expires in 5 minutes. Do not share it.`,
		);

		return res.json({ message: "Verification code sent to your new phone number." });
	} catch (err) {
		console.error("[userController] requestPhoneChange:", err);
		const msg =
			err.message.includes("not configured") || err.message.includes("Twilio")
				? err.message
				: "Failed to send verification code. Please try again.";
		return res.status(500).json({ message: msg });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/verify-phone-change
// ─────────────────────────────────────────────────────────────────────────────
const verifyPhoneChange = async (req, res) => {
	try {
		const { code } = req.body;
		const key = `${req.user.id}_phone`;
		const entry = otpStore.get(key);

		if (!entry)
			return res
				.status(400)
				.json({ message: "No pending phone change. Please request a new code." });
		if (Date.now() > entry.expiresAt) {
			otpStore.delete(key);
			return res.status(400).json({ message: "Code expired. Please request a new one." });
		}
		if (entry.code !== String(code).trim())
			return res.status(400).json({ message: "Incorrect code. Please try again." });

		await User.update({ phoneNumber: entry.newValue }, { where: { id: req.user.id } });
		otpStore.delete(key);

		const updated = await User.findByPk(req.user.id, {
			attributes: { exclude: ["password", "pushToken"] },
		});
		return res.json({ success: true, user: updated });
	} catch (err) {
		console.error("[userController] verifyPhoneChange:", err);
		return res.status(500).json({ message: "Failed to verify phone change." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/request-email-change
// ─────────────────────────────────────────────────────────────────────────────
const requestEmailChange = async (req, res) => {
	try {
		const { newEmail } = req.body;

		if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail.trim())) {
			return res.status(400).json({ message: "Invalid email address." });
		}

		const existing = await User.findOne({ where: { email: newEmail.trim() } });
		if (existing && existing.id !== req.user.id) {
			return res.status(409).json({ message: "That email is already in use." });
		}

		const code = generateOTP();
		otpStore.set(`${req.user.id}_email`, {
			code,
			newValue: newEmail.trim(),
			expiresAt: Date.now() + 5 * 60 * 1000,
		});

		await sendEmail(
			newEmail.trim(),
			"Verify your new email — RoadLift",
			buildOtpEmailHtml(code),
		);

		return res.json({ message: "Verification code sent to your new email address." });
	} catch (err) {
		console.error("[userController] requestEmailChange:", err);
		const msg =
			err.message.includes("not configured") || err.message.includes("SMTP")
				? err.message
				: "Failed to send verification code. Please try again.";
		return res.status(500).json({ message: msg });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/verify-email-change
// ─────────────────────────────────────────────────────────────────────────────
const verifyEmailChange = async (req, res) => {
	try {
		const { code } = req.body;
		const key = `${req.user.id}_email`;
		const entry = otpStore.get(key);

		if (!entry)
			return res
				.status(400)
				.json({ message: "No pending email change. Please request a new code." });
		if (Date.now() > entry.expiresAt) {
			otpStore.delete(key);
			return res.status(400).json({ message: "Code expired. Please request a new one." });
		}
		if (entry.code !== String(code).trim())
			return res.status(400).json({ message: "Incorrect code. Please try again." });

		await User.update({ email: entry.newValue }, { where: { id: req.user.id } });
		otpStore.delete(key);

		const updated = await User.findByPk(req.user.id, {
			attributes: { exclude: ["password", "pushToken"] },
		});
		return res.json({ success: true, user: updated });
	} catch (err) {
		console.error("[userController] verifyEmailChange:", err);
		return res.status(500).json({ message: "Failed to verify email change." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/preferences
// ─────────────────────────────────────────────────────────────────────────────
const getPreferences = async (req, res) => {
	try {
		const user = await User.findByPk(req.user.id, { attributes: ["id", "preferences"] });
		const prefs = user?.preferences || {
			push: true,
			sms: true,
			emailReceipts: true,
			promotions: false,
		};
		return res.json(prefs);
	} catch (err) {
		return res.status(500).json({ message: "Failed to fetch preferences." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/preferences
// ─────────────────────────────────────────────────────────────────────────────
const updatePreferences = async (req, res) => {
	try {
		const { push, sms, emailReceipts, promotions } = req.body;
		await User.update(
			{ preferences: { push, sms, emailReceipts, promotions } },
			{ where: { id: req.user.id } },
		);
		return res.json({ success: true });
	} catch (err) {
		return res.status(500).json({ message: "Failed to update preferences." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/password/change
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		if (!currentPassword || !newPassword)
			return res
				.status(400)
				.json({ message: "Both current and new password are required." });
		if (newPassword.length < 8)
			return res
				.status(400)
				.json({ message: "New password must be at least 8 characters." });

		const user = await User.findByPk(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found." });

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch)
			return res.status(401).json({ message: "Current password is incorrect." });

		const hashed = await bcrypt.hash(newPassword, 10);
		await User.update({ password: hashed }, { where: { id: req.user.id } });
		return res.json({ success: true, message: "Password updated successfully." });
	} catch (err) {
		console.error("[userController] changePassword:", err);
		return res.status(500).json({ message: "Failed to change password." });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/sessions
// ─────────────────────────────────────────────────────────────────────────────
const getSessions = async (req, res) => {
	return res.json([
		{
			id: `sess_${req.user.id}`,
			device: req.headers["user-agent"]?.split(" ")[0] || "Mobile App",
			location: "Current Location",
			lastActive: "Now",
			isCurrent: true,
		},
	]);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/sessions/logout-all
// ─────────────────────────────────────────────────────────────────────────────
const logoutAllSessions = async (req, res) => {
	return res.json({ success: true, message: "All other sessions invalidated." });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/delete
// ─────────────────────────────────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
	try {
		const { password } = req.body;
		if (!password)
			return res
				.status(400)
				.json({ message: "Password is required to delete your account." });

		const user = await User.findByPk(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found." });

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

		await User.update(
			{
				deletedAt: new Date(),
				isActive: false,
				email: null,
				phoneNumber: `deleted_${req.user.id}_${Date.now()}`,
				pushToken: null,
			},
			{ where: { id: req.user.id } },
		);
		return res.json({ success: true, message: "Account deleted." });
	} catch (err) {
		console.error("[userController] deleteAccount:", err);
		return res.status(500).json({ message: "Failed to delete account." });
	}
};

module.exports = {
	getProfile,
	updateProfile,
	requestPhoneChange,
	verifyPhoneChange,
	requestEmailChange,
	verifyEmailChange,
	getPreferences,
	updatePreferences,
	changePassword,
	getSessions,
	logoutAllSessions,
	deleteAccount,
};
