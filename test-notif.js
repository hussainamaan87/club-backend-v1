const fetch = require("node-fetch");

// ================= CONFIG =================
const BASE_URL = "https://club-backend-v1.onrender.com";

// 🔥 PASTE YOUR JWT HERE (NOT FCM TOKEN)
const JWT = "PASTE_YOUR_JWT_HERE";

// 🔥 CUSTOM MESSAGE
const TITLE = "🚀 Custom Test";
const BODY = "This is sent from test-notif.js";

// ==========================================

async function sendNotification() {
  try {
    const res = await fetch(`${BASE_URL}/dev/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${JWT}`
      },
      body: JSON.stringify({
        title: TITLE,
        body: BODY
      })
    });

    const data = await res.json();

    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

sendNotification();