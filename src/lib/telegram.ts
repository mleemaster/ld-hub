/*
 * Telegram Bot API wrapper for push alerts.
 * Sends HTML-formatted messages to a configured chat.
 * No-ops gracefully when env vars are missing (dev/preview environments).
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramAlert(message: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
