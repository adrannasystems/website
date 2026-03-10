import { internal } from "./_generated/api";
import { z } from "zod";
import { internalAction, internalQuery } from "./_generated/server";
import type { MaintenanceTaskState } from "./MaintenanceTaskModel";
import { MaintenanceTaskModelImpl } from "./MaintenanceTaskModel";

export type MaintenanceTaskForNotification = {
  name: string;
  state: MaintenanceTaskState;
  periodsDue: number;
  periodHours: number;
  lastExecutedAt: number | null;
}

export const sendDueOrOverdueMaintenanceTaskNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const ntfyBaseUrl = "https://ntfy.sh";

    const dueOrOverdueTasks: MaintenanceTaskForNotification[] = await ctx.runQuery(
      internal.maintenanceTaskNotifications.listDueOrMoreUrgentTasksForNotifications,
      {},
    );

    const numberOfNotificationsToSend: number = dueOrOverdueTasks.length;

    await Promise.all(
      dueOrOverdueTasks.map((task) =>
        sendNtfyNotification({
          baseUrl: ntfyBaseUrl,
          topic: ntfyTopic,
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
      ),
    );

    return { notificationsSent: numberOfNotificationsToSend };
  },
});

async function sendNtfyNotification(input: {
  baseUrl: string;
  topic: string;
  title: string;
  body: string;
}) {
  const endpoint = `${trimTrailingSlash(input.baseUrl)}/${encodeURIComponent(
    input.topic,
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Title: input.title,
      Tags: "warning",
    },
    body: input.body,
  });

  if (response.ok) {
    return undefined;
  } else {
    const errorBody = await response.text();
    throw new Error(
      `ntfy request failed (${String(response.status)} ${response.statusText}): ${errorBody}`,
    );
  }
}

const ntfyTopicEnvVarName = "NTFY_TOPIC";
const ntfyTopic = z
  .string({ message: `${ntfyTopicEnvVarName} is required` })
  .nonempty()
  .parse(process.env[ntfyTopicEnvVarName]);

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
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
        if (state === "Due" || state === "Overdue") {
          dueOrOverdueTasks.push({
            name: task.name,
            state,
            periodsDue: await task.periodsDue(),
            periodHours: task.periodHours,
            lastExecutedAt: await task.lastExecutedAt(),
          } satisfies MaintenanceTaskForNotification);
        }
      }),
    );

    return dueOrOverdueTasks;
  },
});
