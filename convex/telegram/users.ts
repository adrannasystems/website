import { v } from "convex/values";
import { mutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { authedIdentityOrThrow, databaseUserId } from "../auth";

export const linkChat = mutation({
  args: { chatId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await authedIdentityOrThrow(ctx);
    const userId = databaseUserId(identity);

    const existing = await ctx.db
      .query("telegramChats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, { userId });
    } else {
      await ctx.db.insert("telegramChats", { chatId: args.chatId, userId });
    }

    await ctx.scheduler.runAfter(0, internal.telegram.agent.sendLinkConfirmation, {
      chatId: args.chatId,
      userName: identity.name ?? identity.email ?? identity.preferredUsername ?? "A user",
    });
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
