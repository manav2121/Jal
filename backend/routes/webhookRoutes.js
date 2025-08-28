// backend/routes/webhookRoutes.js
const express = require("express");
const router = express.Router();

/**
 * We'll protect the endpoint with a shared secret sent in a header.
 * In MSG91 dashboard, add a header e.g.:
 *   Key: X-Webhook-Secret
 *   Value: <the same value as process.env.MSG91_WEBHOOK_SECRET>
 */

router.post("/msg91", express.json({ type: "*/*" }), (req, res) => {
  try {
    // 1) Simple auth using a shared secret in header
    const incoming = req.headers["x-webhook-secret"];
    if (!process.env.MSG91_WEBHOOK_SECRET || incoming !== process.env.MSG91_WEBHOOK_SECRET) {
      console.warn("[MSG91 WEBHOOK] Unauthorized attempt");
      return res.status(401).json({ ok: false });
    }

    // 2) Read payload
    const event = req.body; // MSG91 posts JSON

    // 3) LOG IT (for now). In production, store it in DB or update your SMS log.
    console.log("[MSG91 WEBHOOK EVENT]", JSON.stringify(event));

    // Example: handle delivery statuses if provided
    // Common fields (may vary by template/account):
    // event.request_id, event.number, event.status, event.desc, event.err
    // You can upsert into an SmsLog collection here.

    // 4) Always ack fast with 200
    return res.json({ ok: true });
  } catch (e) {
    console.error("[MSG91 WEBHOOK ERROR]", e);
    return res.status(200).json({ ok: true }); // still 200 to stop retries
  }
});

module.exports = router;
