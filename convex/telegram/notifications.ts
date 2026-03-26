import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendTelegramMessage } from "./api";

export const sendDueTasks = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const users = await ctx.runQuery(internal.telegram.users.listUsers);
    if (users.length === 0) return;

    const sharedDueTasks = await ctx.runQuery(internal.telegram.tasks.getSharedDueTasks, {});
    const sharedDueIds = new Set(sharedDueTasks.map((t) => t.id));

    await Promise.allSettled(
      users.map(async (user) => {
        const privateDueTasks = await ctx.runQuery(internal.telegram.tasks.getDueTasks, {
          chatId: user.chatId,
        });
        const privateDueOnly = privateDueTasks.filter((t) => !sharedDueIds.has(t.id));
        const allDue = [...privateDueOnly, ...sharedDueTasks];

        if (allDue.length === 0) return;

        const lines = allDue.map((t) => `• ${t.name} — ${t.state}${t.shared ? " [shared]" : ""}`);
        const message = `Tasks due:\n${lines.join("\n")}`;
        await sendTelegramMessage(user.chatId, message);
      }),
    );
  },
});
