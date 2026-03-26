import { z } from "zod";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const envVarName = "TELEGRAM_BOT_TOKEN";
  const token = z
    .string({ message: `${envVarName} is required` })
    .nonempty()
    .parse(process.env[envVarName]);

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${String(response.status)}): ${body}`);
  }
}
