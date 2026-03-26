import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const upsertUser = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramUsers")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existing === null) {
      await ctx.db.insert("telegramUsers", { chatId: args.chatId });
    }
  },
});

export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("telegramUsers").take(100);
  },
});
