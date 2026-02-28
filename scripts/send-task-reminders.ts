import { queryTasksForReminders } from "../src/notion-task-queries";

async function main() {
  const ntfyTopic = requireEnv("NTFY_TOPIC");

  const tasksDueToday = await queryTasksForReminders();

  if (tasksDueToday.length > 0) {
    for (const task of tasksDueToday) {
      const dueDateText = task.dueDate;
      const body = `Task: ${task.task}\nDue: ${dueDateText}`;
      await sendNtfyNotification(ntfyTopic, "Task still open", body);
    }
  }
  console.log(
    `Sent ${String(tasksDueToday.length)} reminder notification(s) for tasks due today`,
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function sendNtfyNotification(
  topic: string,
  title: string,
  body: string,
) {
  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers: {
      Title: title,
      Tags: "warning",
    },
    body,
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

void main();
