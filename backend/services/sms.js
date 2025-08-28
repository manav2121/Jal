<<<<<<< HEAD
// backend/services/sms.js
const axios = require("axios");

async function sendWithTwilio(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM; // your Twilio phone number, e.g. +12025550123
  if (!sid || !token || !from) throw new Error("Twilio env vars missing");

  const twilio = require("twilio")(sid, token);
  const msg = await twilio.messages.create({ to, from, body });
  return { ok: true, id: msg.sid };
}

async function sendWithMSG91(to, body) {
  // India-friendly. Use your DLT-approved template if required.
  const key = process.env.MSG91_API_KEY;
  const sender = process.env.MSG91_SENDER_ID || "JALWTR"; // 6-char sender id
  const templateId = process.env.MSG91_TEMPLATE_ID; // optional but recommended
  if (!key || !sender) throw new Error("MSG91 env vars missing");

  // MSG91 v5 example (Transactional)
  const payload = {
    sender,
    route: "4", // transactional
    country: "91",
    sms: [{ message: body, to: [to.replace("+", "")], template_id: templateId }].filter(Boolean),
  };

  const res = await axios.post("https://api.msg91.com/api/v5/sms/send", payload, {
    headers: {
      authkey: key,
      "Content-Type": "application/json",
    },
  });
  if (res.data && (res.data.type === "success" || res.data.request_id)) {
    return { ok: true, id: res.data.request_id || "msg91" };
  }
  throw new Error("MSG91 send failed");
}

async function sendSms(to, body) {
  const provider = String(process.env.SMS_PROVIDER || "twilio").toLowerCase();
  if (provider === "twilio") return sendWithTwilio(to, body);
  if (provider === "msg91") return sendWithMSG91(to, body);
  throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
}

module.exports = { sendSms };
=======
// backend/services/sms.js
const axios = require("axios");

/**
 * Send SMS using MSG91 v5 API.
 * You MUST have:
 *  - MSG91_API_KEY          (Render env var)
 *  - MSG91_SENDER_ID        (DLT-approved 6-char Header, e.g., JALWTR)
 *  - MSG91_TEMPLATE_ID      (DLT-approved Template ID for OTP)
 *
 * For India, route "4" = Transactional. country "91" = India.
 */
async function sendWithMSG91(to, message) {
  const key = process.env.MSG91_API_KEY;
  const sender = process.env.MSG91_SENDER_ID;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!key || !sender || !templateId) {
    throw new Error("MSG91 env vars missing (MSG91_API_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID)");
  }

  // MSG91 expects digits only (no +) for Indian numbers
  const cleanTo = String(to).replace("+", "");

  const payload = {
    sender,
    route: "4",
    country: "91",
    sms: [
      {
        message,                 // Will be checked against the DLT template
        to: [cleanTo],
        template_id: templateId, // REQUIRED for DLT
      },
    ],
  };

  const res = await axios.post("https://api.msg91.com/api/v5/sms/send", payload, {
    headers: {
      authkey: key,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  // MSG91 success formats vary; these checks cover common cases
  if (res.data && (res.data.type === "success" || res.data.request_id)) {
    return { ok: true, id: res.data.request_id || "msg91" };
  }
  throw new Error("MSG91 send failed");
}

async function sendSms(to, body) {
  // We keep the provider key for future flexibility; default to MSG91
  const provider = String(process.env.SMS_PROVIDER || "msg91").toLowerCase();
  if (provider !== "msg91") {
    console.warn(`[sms] Unknown SMS_PROVIDER=${provider}, defaulting to MSG91`);
  }
  return sendWithMSG91(to, body);
}

module.exports = { sendSms };
>>>>>>> main
