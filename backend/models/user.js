const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * We’re moving to phone-OTP auth.
 * - phone: required, unique (normalized to E.164-ish or 10-digit with +91)
 * - email: optional; keep unique+sparse so multiple nulls are allowed
 * - name: optional (default empty)
 * - password: optional (kept for backward compatibility; not used by OTP flow)
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6 },
    role: { type: String, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

// Only hash if password present and modified (legacy support)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
