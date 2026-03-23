import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { z } from "zod";
import { internalAction, internalQuery } from "./_generated/server";
import type { MaintenanceTaskState } from "./MaintenanceTaskModel";
import { MaintenanceTaskModelImpl } from "./MaintenanceTaskModel";

export type MaintenanceTaskForNotification = {
  id: Id<"maintenanceTasks">;
  name: string;
  state: MaintenanceTaskState;
  periodsDue: number;
  periodHours: number;
  lastExecutedAt: number | null;
  userId: string | undefined;
};

export const sendDueOrOverdueMaintenanceTaskNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueOrOverdueTasks: MaintenanceTaskForNotification[] =
      await ctx.runQuery(
        internal.maintenanceTaskNotifications
          .listDueOrMoreUrgentTasksForNotifications,
        {},
      );

    const notificationPromises: Promise<void>[] = [];
    let skippedTasksCount = 0;
    for (const task of dueOrOverdueTasks) {
      if (task.userId === undefined) {
        skippedTasksCount += 1;
      } else {
        notificationPromises.push(
          sendOneSignalNotification({
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
                task.lastExecutedAt === null
                  ? "Never"
                  : new Date(task.lastExecutedAt).toISOString()
              }`,
            ].join("\n"),
          }),
        );
      }
    }

    if (skippedTasksCount > 0) {
      console.warn(
        `Skipping ${String(skippedTasksCount)} due/overdue tasks without userId`,
      );
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
      console.warn(
        `Failed to send ${String(notificationsFailedToSendCount)} notifications`,
      );
    }

    return {
      notificationsSent: notificationsSentCount,
      notificationsSkippedMissingUserId: skippedTasksCount,
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

/** Convex env: deployed web origin (e.g. https://task.example.com or http://localhost:3000). */
const publicAppOriginEnvVarName = "PUBLIC_APP_ORIGIN";
const publicAppOrigin = z
  .string({ message: `${publicAppOriginEnvVarName} is required` })
  .url()
  .parse(process.env[publicAppOriginEnvVarName]);

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
      .filter((q) =>
        q.or(
          q.eq(q.field("deletedAt"), null),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const dueOrOverdueTasks: MaintenanceTaskForNotification[] = [];
    await Promise.all(
      taskDbos.map(async (dbo) => {
        const task = new MaintenanceTaskModelImpl(ctx, dbo);
        const state = await task.state();
        if (state === "Due" || state === "Overdue" || state === "Never Done") {
          dueOrOverdueTasks.push({
            id: task.id,
            name: task.name,
            state,
            periodsDue: await task.periodsDue(),
            periodHours: task.periodHours,
            lastExecutedAt: await task.lastExecutedAt(),
            userId: dbo.userId,
          } satisfies MaintenanceTaskForNotification);
        }
      }),
    );

    return dueOrOverdueTasks;
  },
});
