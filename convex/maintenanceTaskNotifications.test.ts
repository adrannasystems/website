import { describe, expect, it } from "vitest";
import { buildTelegramChatsByUserId } from "./telegram/chatLinks";

describe("buildTelegramChatsByUserId", () => {
  it("groups multiple chats under the same user", () => {
    const result = buildTelegramChatsByUserId([
      { userId: "user-1", chatId: "chat-a" },
      { userId: "user-1", chatId: "chat-b" },
      { userId: "user-2", chatId: "chat-c" },
    ]);

    expect(result.get("user-1")).toEqual(["chat-a", "chat-b"]);
    expect(result.get("user-2")).toEqual(["chat-c"]);
  });
});
