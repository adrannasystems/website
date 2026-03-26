import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const upsertChat = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramChats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existing === null) {
      await ctx.db.insert("telegramChats", { chatId: args.chatId });
    }
  },
});

export const listLinkedChats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("telegramChats").take(100);
    return all.filter((c) => c.userId !== undefined);
  },
});

export const getLinkedUserId = internalQuery({
  args: { chatId: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();
    return chat?.userId ?? null;
  },
});

export const applyLinkToken = internalMutation({
  args: { chatId: v.string(), token: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const tokenDoc = await ctx.db
      .query("telegramLinkTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (tokenDoc === null) {
      return {
        success: false,
        message: "Invalid or expired link code. Generate a new one in the app.",
      };
    }

    if (Date.now() > tokenDoc.expiresAt) {
      await ctx.db.delete(tokenDoc._id);
      return {
        success: false,
        message: "This link code has expired. Generate a new one in the app.",
      };
    }

    const existing = await ctx.db
      .query("telegramChats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, { userId: tokenDoc.userId });
    } else {
      await ctx.db.insert("telegramChats", { chatId: args.chatId, userId: tokenDoc.userId });
    }

    await ctx.db.delete(tokenDoc._id);
    return { success: true, message: "Your Telegram account is now linked! You can use the bot." };
  },
});
