import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { z } from "zod";
import { internalAction, internalQuery } from "./_generated/server";
import type { MaintenanceTaskState } from "./MaintenanceTaskModel";
import { MaintenanceTaskModelImpl } from "./MaintenanceTaskModel";
import { sendTelegramMessage } from "./telegram/api";
import { buildTelegramChatsByUserId } from "./telegram/chatLinks";
import { publicAppOrigin } from "./env";

export type MaintenanceTaskForNotification = {
  id: Id<"maintenanceTasks">;
  name: string;
  state: MaintenanceTaskState;
  periodsDue: number;
  periodHours: number;
  lastExecutedAt: number | null;
  userId: string;
};

export const sendDueOrOverdueMaintenanceTaskNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueOrOverdueTasks: MaintenanceTaskForNotification[] = await ctx.runQuery(
      internal.maintenanceTaskNotifications.listDueOrMoreUrgentTasksForNotifications,
      {},
    );

    const userIds = [...new Set(dueOrOverdueTasks.map((task) => task.userId))];
    const linkedChats =
      userIds.length === 0
        ? []
        : await ctx.runQuery(internal.telegram.users.listLinkedChatsForUserIds, { userIds });
    const telegramChatsByUserId = buildTelegramChatsByUserId(linkedChats);

    const notificationPromises: Promise<void>[] = [];
    for (const task of dueOrOverdueTasks) {
      notificationPromises.push(pushWebNotification(task));
      notificationPromises.push(pushTelegramNotification(task, telegramChatsByUserId));
    }

    let notificationsSentCount = 0;
    let notificationsFailedToSendCount = 0;
    for (const result of await Promise.allSettled(notificationPromises)) {
      if (result.status === "fulfilled") {
        notificationsSentCount += 1;
      } else {
        notificationsFailedToSendCount += 1;
      }
    }

    if (notificationsFailedToSendCount > 0) {
      console.warn(`Failed to send ${String(notificationsFailedToSendCount)} notifications`);
    }

    return {
      notificationsSent: notificationsSentCount,
      notificationsFailedToSend: notificationsFailedToSendCount,
    };
  },
});

async function sendOneSignalNotification(input: {
  appId: string;
  restApiKey: string;
  openUrl: string;
  userId: string;
  webPushTopic: string;
  title: string;
  body: string;
}) {
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${input.restApiKey}`,
    },
    body: JSON.stringify({
      app_id: input.appId,
      include_aliases: { external_id: [input.userId] },
      target_channel: "push",
      web_push_topic: input.webPushTopic,
      url: input.openUrl,
      headings: { en: input.title },
      contents: { en: input.body },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OneSignal request failed (${String(response.status)} ${response.statusText}): ${errorBody}`,
    );
  }
}

function pushWebNotification(task: MaintenanceTaskForNotification): Promise<void> {
  return sendOneSignalNotification({
    appId: oneSignalAppId,
    restApiKey: oneSignalRestApiKey,
    openUrl: maintenanceTaskDeepLink(task.id),
    userId: task.userId,
    webPushTopic: `task-${task.id}-state`,
    title: `Task is ${task.state.toLowerCase()}: ${task.name}`,
    body: [
      `Task: ${task.name}`,
      `State: ${task.state}`,
      `Periods Due: ${task.periodsDue === Infinity ? "n/a" : task.periodsDue.toFixed(2)}`,
      `Period [h]: ${String(task.periodHours)}`,
      `Last Executed At: ${
        task.lastExecutedAt === null ? "Never" : new Date(task.lastExecutedAt).toISOString()
      }`,
    ].join("\n"),
  });
}

function pushTelegramNotification(
  task: MaintenanceTaskForNotification,
  telegramChatsByUserId: Map<string, string[]>,
): Promise<void> {
  const chatIds = telegramChatsByUserId.get(task.userId);
  if (chatIds === undefined || chatIds.length === 0) {
    return Promise.resolve();
  }
  return Promise.all(
    chatIds.map(async (chatId) =>
      sendTelegramMessage(chatId, `⚠️ ${task.name} is ${task.state.toLowerCase()}`),
    ),
  ).then(() => undefined);
}

const oneSignalAppIdEnvVarName = "ONESIGNAL_APP_ID";
const oneSignalAppId = z
  .string({ message: `${oneSignalAppIdEnvVarName} is required` })
  .nonempty()
  .parse(process.env[oneSignalAppIdEnvVarName]);

const oneSignalRestApiKeyEnvVarName = "ONESIGNAL_REST_API_KEY";
const oneSignalRestApiKey = z
  .string({ message: `${oneSignalRestApiKeyEnvVarName} is required` })
  .nonempty()
  .parse(process.env[oneSignalRestApiKeyEnvVarName]);

function maintenanceTaskDeepLink(taskId: Id<"maintenanceTasks">): string {
  return new URL(
    `/?task=${encodeURIComponent(taskId)}`,
    publicAppOrigin.endsWith("/") ? publicAppOrigin : `${publicAppOrigin}/`,
  ).toString();
}

export const listDueOrMoreUrgentTasksForNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    const taskDbos = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_deletedAt", (q) => q.eq("deletedAt", null))
      .collect();

    const dueOrOverdueTasks: MaintenanceTaskForNotification[] = [];
    for (const dbo of taskDbos) {
      const task = new MaintenanceTaskModelImpl(dbo);
      const state = task.state;
      if (
        (state === "Due" || state === "Overdue" || state === "Never Done") &&
        task.notificationsEnabled
      ) {
        dueOrOverdueTasks.push({
          id: task.id,
          name: task.name,
          state,
          periodsDue: task.periodsDue,
          periodHours: task.periodHours,
          lastExecutedAt: task.lastExecutedAt,
          userId: task.userId,
        } satisfies MaintenanceTaskForNotification);
      }
    }

    return dueOrOverdueTasks;
  },
});
