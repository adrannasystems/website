import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "../_generated/server";
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

export const unlinkChat = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (chat?.userId === undefined) {
      return false;
    }

    await ctx.db.patch(chat._id, { userId: undefined });
    return true;
  },
});

export const listLinkedChatsForUserIds = internalQuery({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args): Promise<{ chatId: string; userId: string }[]> => {
    const linkedChats: { chatId: string; userId: string }[] = [];

    for (const userId of args.userIds) {
      const chats = await ctx.db
        .query("telegramChats")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      for (const chat of chats) {
        if (chat.userId !== undefined) {
          linkedChats.push({ chatId: chat.chatId, userId: chat.userId });
        }
      }
    }

    return linkedChats;
  },
});
