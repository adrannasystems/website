import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendTelegramMessage } from "./api";

export const sendDueTasks = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const chats = await ctx.runQuery(internal.telegram.users.listLinkedChats);
    if (chats.length === 0) return;

    const sharedDueTasks = await ctx.runQuery(internal.telegram.tasks.getSharedDueTasks, {});
    const sharedDueIds = new Set(sharedDueTasks.map((t) => t.id));

    await Promise.allSettled(
      chats.map(async (chat) => {
        const userId = chat.userId as string;
        const privateDueTasks = await ctx.runQuery(internal.telegram.tasks.getDueTasks, {
          userId,
        });
        const privateDueOnly = privateDueTasks.filter((t) => !sharedDueIds.has(t.id));
        const allDue = [...privateDueOnly, ...sharedDueTasks];

        if (allDue.length === 0) return;

        const lines = allDue.map((t) => `• ${t.name} — ${t.state}${t.shared ? " [shared]" : ""}`);
        await sendTelegramMessage(chat.chatId, `Tasks due:\n${lines.join("\n")}`);
      }),
    );
  },
});
