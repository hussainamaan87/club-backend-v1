import axios from "axios";

export const sendTelegram = async (text: string) => {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text
      }
    );
  } catch (e) {
    if (e instanceof Error) {
      console.log("Telegram failed", e.message);
    } else {
      console.log("Telegram failed", e);
    }
  }
};