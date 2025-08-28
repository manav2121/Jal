// backend/routes/authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Otp = require("../models/otp");
const { sendSms } = require("../services/sms");

const router = express.Router();
const DEBUG = String(process.env.AUTH_DEBUG || "").toLowerCase() === "true";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

/** Normalize Indian numbers to +91XXXXXXXXXX */
function normalizePhone(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  if (s.startsWith("+")) return s.replace(/[^\d+]/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith("91") ? `+${digits}` : `+${digits}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// POST /api/auth/otp/request { phone }
router.post("/otp/request", async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone || phone.length < 10) {
      return res.status(400).json({ message: "Valid phone is required" });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await Otp.findOneAndUpdate(
      { phone },
      { code, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    // IMPORTANT: Your MSG91 DLT template must match this format.
    // Example template: "Your Jal OTP is {{otp}}. It expires in 5 min."
    // If MSG91 enforces variables, ensure your approved template accepts it as-is.
    const smsText = `Your Jal OTP is ${code}. It expires in 5 min.`;

    try {
      const result = await sendSms(phone, smsText);
      if (DEBUG) console.log("[OTP SMS SENT]", result);
    } catch (err) {
      console.error("[OTP SMS ERROR]", err.message || err);
      return res.status(502).json({ message: "Failed to send OTP SMS. Try again." });
    }

    console.log(`[OTP] ${phone} -> ${code} (expires ${expiresAt.toISOString()})`);

    const payload = { ok: true, message: "OTP sent" };
    if (DEBUG) payload.devCode = code; // only in debug
    return res.json(payload);
  } catch (e) {
    if (DEBUG) console.error("[OTP REQUEST ERROR]", e);
    return res.status(500).json({ message: "Server error during OTP request" });
  }
});

// POST /api/auth/otp/verify { phone, code, name? }
router.post("/otp/verify", async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || "").trim();
    const name = String(req.body?.name || "").trim();

    if (!phone || !code) {
      return res.status(400).json({ message: "Phone and OTP code are required" });
    }

    const rec = await Otp.findOne({ phone });
    if (!rec) return res.status(400).json({ message: "OTP not requested" });
    if (rec.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (rec.code !== code) {
      await Otp.updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || "User",
      });
      if (DEBUG) console.log("[OTP NEW USER]", { id: user._id.toString(), phone });
    }

    await Otp.deleteOne({ _id: rec._id });

    return res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token: signToken(user),
    });
  } catch (e) {
    if (DEBUG) console.error("[OTP VERIFY ERROR]", e);
    return res.status(500).json({ message: "Server error during OTP verification" });
  }
});

module.exports = router;
