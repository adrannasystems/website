import { describe, expect, it, vi } from "vitest";
import {
  buildSetMyCommandsPayload,
  buildSetMyCommandsUrl,
  readTelegramBotToken,
  syncTelegramCommands,
} from "./sync-telegram-commands";

describe("syncTelegramCommands", () => {
  it("builds the Telegram payload from the code-owned command list", () => {
    expect(buildSetMyCommandsPayload()).toEqual({
      commands: [
        {
          command: "help",
          description: "Show available commands and how to use the bot",
        },
        {
          command: "unlink",
          description: "Unlink this chat from your account",
        },
      ],
    });
  });

  it("builds the correct setMyCommands URL", () => {
    expect(buildSetMyCommandsUrl("123:token-abc")).toBe(
      "https://api.telegram.org/bot123:token-abc/setMyCommands",
    );
  });

  it("fails clearly when TELEGRAM_BOT_TOKEN is missing", () => {
    expect(() => readTelegramBotToken({})).toThrowError("TELEGRAM_BOT_TOKEN is required");
  });

  it("posts the command payload to Telegram", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn(),
    });

    await syncTelegramCommands({
      fetchImpl,
      env: { TELEGRAM_BOT_TOKEN: "123:token-abc" },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:token-abc/setMyCommands",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildSetMyCommandsPayload()),
      }),
    );
  });
});
