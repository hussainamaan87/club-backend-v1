// ================= CONFIG =================
const BASE_URL = "https://club-backend-v1.onrender.com";

// 🔥 CUSTOM MESSAGE
const TITLE = "Hello from Amaan";
const BODY = "This is sent for you by Amaan's test script. Hope you see this!";

// ==========================================

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(res => rl.question(q, res));
}

async function main() {
  try {
    console.log("🚀 Notification CLI\n");

    // ================= PHONE =================
    const phone = await ask("📱 Enter phone: ");

    // ================= SEND OTP =================
    console.log("\n📤 Sending OTP...");
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone })
    });

    // ================= ENTER OTP =================
    const otp = await ask("🔐 Enter OTP: ");

    // ================= VERIFY =================
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone, otp })
    });

    const verifyData = await verifyRes.json();

    const token = verifyData?.data?.token;

    if (!token) throw new Error("JWT not received");

    console.log("✅ Logged in");

    // ================= FCM TOKEN =================
    const fcm = await ask("\n📲 Paste FCM token (from app): ");

    console.log("\n💾 Saving FCM token...");
    await fetch(`${BASE_URL}/auth/fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ token: fcm })
    });

    console.log("✅ FCM token saved");

    // ================= SEND NOTIF =================
    console.log("\n📢 Sending Notification...");
    const notifRes = await fetch(`${BASE_URL}/dev/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        title: TITLE,
        body: BODY
      })
    });

    const notifData = await notifRes.json();

    console.log("\n📊 Result:");
    console.log("Status:", notifRes.status);
    console.log("Response:", notifData);

    console.log("\n🔥 DONE — check your phone!");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    rl.close();
  }
}

main();