const TELEGRAM_API_BASE = "https://api.telegram.org";

export function buildTelegramApiUrl(token: string, method: string): string {
  return new URL(`./bot${token}/${method}`, TELEGRAM_API_BASE).toString();
}
