import { describe, expect, it } from "vitest";
import { buildTelegramApiUrl } from "./apiUrls";

describe("buildTelegramApiUrl", () => {
  it("builds Telegram API URLs for bot tokens containing a colon", () => {
    expect(buildTelegramApiUrl("123:token-abc", "sendMessage")).toBe(
      "https://api.telegram.org/bot123:token-abc/sendMessage",
    );
    expect(buildTelegramApiUrl("123:token-abc", "setMyCommands")).toBe(
      "https://api.telegram.org/bot123:token-abc/setMyCommands",
    );
  });
});
