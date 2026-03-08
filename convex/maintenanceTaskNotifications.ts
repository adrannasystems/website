import { internal } from "./_generated/api";
import { z } from "zod";
import { internalAction } from "./_generated/server";

export const sendDueOrOverdueMaintenanceTaskNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const ntfyBaseUrl = "https://ntfy.sh";

    const dueOrOverdueTasks = await ctx.runQuery(
      internal.maintenanceTasks.listDueOrMoreUrgentTasksForNotifications,
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
