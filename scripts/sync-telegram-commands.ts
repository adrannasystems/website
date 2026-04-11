import { z } from "zod";
import { telegramBotCommands } from "../convex/telegram/commands.ts";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function buildSetMyCommandsPayload() {
  return {
    commands: telegramBotCommands.map((command) => ({
      command: command.command,
      description: command.description,
    })),
  };
}

export function buildSetMyCommandsUrl(token: string): string {
  const url = new URL(TELEGRAM_API_BASE);
  url.pathname = `bot${token}/setMyCommands`;
  return url.toString();
}

export function readTelegramBotToken(env: NodeJS.ProcessEnv = process.env): string {
  const envVarName = "TELEGRAM_BOT_TOKEN";
  return z
    .string({ message: `${envVarName} is required` })
    .nonempty()
    .parse(env[envVarName]);
}

export async function syncTelegramCommands(input?: {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const fetchImpl = input?.fetchImpl ?? fetch;
  const env = input?.env ?? process.env;
  const token = readTelegramBotToken(env);
  const response = await fetchImpl(buildSetMyCommandsUrl(token), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildSetMyCommandsPayload()),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram setMyCommands failed (${String(response.status)}): ${body}`);
  }
}

const isEntrypoint =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntrypoint) {
  await syncTelegramCommands();
}
