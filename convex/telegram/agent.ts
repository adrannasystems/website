import { v } from "convex/values";
import { z } from "zod";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendTelegramMessage } from "./api";
import type { Id } from "../_generated/dataModel";
import {
  extractTelegramCommand,
  formatLinkConfirmationMessage,
  formatTelegramHelpMessage,
  telegramHelpCommand,
  telegramUnlinkCommand,
} from "./commands";

import { publicAppOrigin } from "../env";

type AnthropicMessage = {
  role: "user" | "assistant";
  content: AnthropicContentBlock[] | string;
};

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicResponse = {
  stop_reason: "end_turn" | "tool_use" | string;
  content: AnthropicContentBlock[];
};

type ToolHandler = (
  ctx: ActionCtx,
  userId: string,
  input: Record<string, unknown>,
) => Promise<string>;

const TOOLS: {
  name: string;
  description: string;
  input_schema: { type: string; properties: Record<string, unknown>; required: string[] };
  handler: ToolHandler;
}[] = [
  {
    name: "list_tasks",
    description:
      "List all tasks visible to the user (own private tasks + all shared tasks), with their current state.",
    input_schema: { type: "object", properties: {}, required: [] },
    handler: async (ctx, userId) => {
      const tasks = await ctx.runQuery(internal.telegram.tasks.listTasks, { userId });
      if (tasks.length === 0) return "No tasks yet.";
      return tasks
        .map(
          (t) =>
            `• ${t.name} (every ${String(t.periodHours)}h) — ${t.state}${t.shared ? " [shared]" : ""} [id: ${t.id}]`,
        )
        .join("\n");
    },
  },
  {
    name: "get_due_tasks",
    description: "List tasks that are Due, Overdue, or Never Done.",
    input_schema: { type: "object", properties: {}, required: [] },
    handler: async (ctx, userId) => {
      const tasks = await ctx.runQuery(internal.telegram.tasks.getDueTasks, { userId });
      if (tasks.length === 0) return "Nothing due right now.";
      return tasks
        .map((t) => `• ${t.name} — ${t.state}${t.shared ? " [shared]" : ""} [id: ${t.id}]`)
        .join("\n");
    },
  },
  {
    name: "create_task",
    description: "Create a new recurring maintenance task.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Task name, e.g. 'Clean filter'" },
        periodHours: { type: "number", description: "How often the task should be done, in hours" },
        shared: {
          type: "boolean",
          description: "If true, visible and actionable by all users. Defaults to false (private).",
        },
      },
      required: ["name", "periodHours"],
    },
    handler: async (ctx, userId, input) => {
      const taskId = await ctx.runMutation(internal.maintenanceTasks.createTaskForUser, {
        userId,
        name: String(input["name"]),
        periodHours: Number(input["periodHours"]),
        shared: Boolean(input["shared"] ?? false),
      });
      return `Task created with id: ${taskId}`;
    },
  },
  {
    name: "log_execution",
    description: "Record that a task was just done (or done at a specific time).",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The task ID" },
        executedAt: {
          type: "string",
          description: "ISO-8601 UTC timestamp, e.g. 2026-04-07T12:34:56.789Z.",
        },
      },
      required: ["taskId", "executedAt"],
    },
    handler: async (ctx, userId, input) => {
      const executedAtRaw = input["executedAt"];
      const baseArgs = {
        userId,
        taskId: String(input["taskId"]) as Id<"maintenanceTasks">,
      };

      const executedAtIso = z.iso
        .datetime({
          offset: false,
          local: false,
          error:
            "Invalid log_execution input: `executedAt` must be an ISO-8601 UTC string with trailing `Z` (for example: 2026-04-07T12:34:56.789Z).",
        })
        .parse(executedAtRaw);

      const executedAt = Date.parse(executedAtIso);
      if (Number.isNaN(executedAt)) {
        throw new Error(
          "Invalid log_execution input: `executedAt` could not be parsed. Use a full ISO-8601 UTC timestamp like 2026-04-07T12:34:56.789Z.",
        );
      }

      await ctx.runMutation(internal.maintenanceTasks.logExecutionForUser, {
        ...baseArgs,
        executedAt,
      });
      return "Execution logged.";
    },
  },
  {
    name: "archive_task",
    description: "Archive (soft-delete) a task.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The task ID" },
      },
      required: ["taskId"],
    },
    handler: async (ctx, userId, input) => {
      await ctx.runMutation(internal.maintenanceTasks.archiveTaskForUser, {
        userId,
        taskId: String(input["taskId"]) as Id<"maintenanceTasks">,
      });
      return "Task archived.";
    },
  },
];

const SYSTEM_PROMPT = `You are a maintenance task assistant. You help users manage recurring household or personal tasks — things like cleaning filters, changing batteries, or doing backups.

You can list tasks, create new ones, log executions, and archive tasks. Tasks can be private (only you see them) or shared (all household members see them).

Be concise and friendly. When listing tasks, include their state (All Good / Due / Overdue / Never Done) and period. When confirming actions, be brief.`;

function getSystemPromptNowUtc(nowIsoUtc: string): string {
  return `${SYSTEM_PROMPT}

Current UTC time: ${nowIsoUtc}

When a user refers to relative time (for example: "today", "yesterday", "tomorrow"), resolve it against the current UTC time above.
For log_execution.executedAt, pass a UTC ISO-8601 string with trailing "Z" (for example: 2026-04-07T12:34:56.789Z).`;
}

export const processMessage = internalAction({
  args: {
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const trimmedText = args.text.trim();
    const command = extractTelegramCommand(trimmedText);
    const linkUrl = buildTelegramLinkUrl(args.chatId);

    const linkedUserId = await ctx.runQuery(internal.telegram.users.getLinkedUserId, {
      chatId: args.chatId,
    });
    const isLinked = linkedUserId !== null;

    if (command === telegramHelpCommand) {
      await sendTelegramMessage(
        args.chatId,
        formatTelegramHelpMessage({ isLinked, linkUrl: isLinked ? undefined : linkUrl }),
      );
      return;
    } else if (command === telegramUnlinkCommand) {
      const unlinked = await ctx.runMutation(internal.telegram.users.unlinkChat, {
        chatId: args.chatId,
      });
      await sendTelegramMessage(
        args.chatId,
        unlinked
          ? `This chat has been unlinked from your account.\n\nUse the link flow to reconnect it later.\nUse ${telegramHelpCommand} to see available commands.`
          : `This chat is not currently linked.\n\nLink it here:\n${linkUrl}\n\nUse ${telegramHelpCommand} to see available commands.`,
      );
      return;
    } else if (!isLinked) {
      await sendTelegramMessage(
        args.chatId,
        `This chat is not linked to a Taskologist account.\n\nTap the link to link it:\n${linkUrl}\n\nAfter linking, use ${telegramHelpCommand} to see commands, including ${telegramUnlinkCommand} for disconnecting this chat later.`,
      );
      return;
    } else {
      await processLlmMessage(ctx, {
        chatId: args.chatId,
        text: trimmedText,
        userId: linkedUserId,
      });
    }
  },
});

export const sendLinkConfirmation = internalAction({
  args: { chatId: v.string(), userName: v.string() },
  handler: async (_ctx, args): Promise<void> => {
    await sendTelegramMessage(args.chatId, formatLinkConfirmationMessage(args.userName));
  },
});

function buildTelegramLinkUrl(chatId: string): string {
  const url = new URL("telegram-link", publicAppOrigin);
  url.searchParams.set("chat", chatId);
  return url.toString();
}

async function processLlmMessage(
  ctx: ActionCtx,
  args: { chatId: string; text: string; userId: string },
): Promise<void> {
  const envVarName = "ANTHROPIC_API_KEY";
  const apiKey = z
    .string({ message: `${envVarName} is required` })
    .nonempty()
    .parse(process.env[envVarName]);

  const messages: AnthropicMessage[] = [{ role: "user", content: args.text }];

  for (let i = 0; i < 10; i++) {
    const nowIsoUtc = new Date().toISOString();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: getSystemPromptNowUtc(nowIsoUtc),
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        })),
        messages,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      await sendTelegramMessage(args.chatId, "Sorry, something went wrong.");
      console.error("Anthropic API error:", response.status, body);
      return;
    }

    const result = (await response.json()) as AnthropicResponse;

    if (result.stop_reason === "end_turn") {
      const textBlock = result.content.find((b) => b.type === "text");
      const replyText = textBlock?.type === "text" ? textBlock.text : "Done.";
      await sendTelegramMessage(args.chatId, replyText);
      return;
    } else if (result.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: result.content });
      messages.push({
        role: "user",
        content: await executeToolCalls(ctx, args.userId, result.content),
      });
    } else {
      await sendTelegramMessage(args.chatId, "Sorry, something went wrong.");
      return;
    }
  }

  await sendTelegramMessage(args.chatId, "Sorry, I got confused. Please try again.");
}

async function executeToolCalls(
  ctx: ActionCtx,
  userId: string,
  contentBlocks: AnthropicContentBlock[],
): Promise<AnthropicContentBlock[]> {
  const toolResults: AnthropicContentBlock[] = [];

  for (const block of contentBlocks) {
    if (block.type === "tool_use") {
      let toolResultContent: string;
      try {
        toolResultContent = await executeTool(ctx, userId, block.name, block.input);
      } catch (err) {
        toolResultContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: toolResultContent,
      });
    }
  }

  return toolResults;
}

async function executeTool(
  ctx: ActionCtx,
  userId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  const tool = TOOLS.find((t) => t.name === name);
  if (tool === undefined) return `Unknown tool: ${name}`;
  return tool.handler(ctx, userId, input);
}
