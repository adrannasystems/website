import { describe, expect, it } from "vitest";
import {
  extractTelegramCommand,
  formatLinkConfirmationMessage,
  formatTelegramHelpMessage,
  telegramBotCommands,
  telegramHelpCommand,
  telegramLinkCommand,
  telegramUnlinkCommand,
} from "./commands";

describe("telegram commands helpers", () => {
  it("exports help and unlink as the command source of truth", () => {
    expect(telegramBotCommands).toEqual([
      {
        command: "help",
        description: "Show available commands and how to use the bot",
      },
      {
        command: "unlink",
        description: "Unlink this chat from your account",
      },
    ]);
  });

  it("extracts slash commands with or without bot usernames", () => {
    expect(extractTelegramCommand(telegramHelpCommand)).toBe(telegramHelpCommand);
    expect(extractTelegramCommand(`${telegramUnlinkCommand}@TaskologistBot please`)).toBe(
      telegramUnlinkCommand,
    );
  });

  it("returns null when the message is not a slash command", () => {
    expect(extractTelegramCommand("show my tasks")).toBeNull();
  });

  it("formats help for unlinked chats with the relink URL and unlink discoverability", () => {
    const message = formatTelegramHelpMessage({
      isLinked: false,
      linkUrl: "https://example.com/telegram-link?chat=1",
    });

    expect(message).toContain(telegramHelpCommand);
    expect(message).toContain(telegramUnlinkCommand);
    expect(message).toContain("https://example.com/telegram-link?chat=1");
    expect(message).toContain(`After linking, you can use ${telegramUnlinkCommand}`);
  });

  it("formats link confirmations with help and unlink guidance", () => {
    const message = formatLinkConfirmationMessage("Andreas");

    expect(message).toContain("Andreas is now linked");
    expect(message).toContain(telegramHelpCommand);
    expect(message).toContain(telegramUnlinkCommand);
  });

  it("defines the link command for link-related copy", () => {
    expect(telegramLinkCommand).toBe("/link");
  });
});
