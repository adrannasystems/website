import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";

export const backfillUserIdOnAllTasks = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    await Promise.all(
      tasks.map((task) => ctx.db.patch(task._id, { userId: args.userId })),
    );

    return { updatedCount: tasks.length };
  },
});

export const backfillMissingLastExecutedAtOnAllTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) => q.eq(q.field("lastExecutedAt"), undefined))
      .collect();

    await Promise.all(
      tasks.map((task) => fixLatestExecutionTimestamp(ctx, task._id)),
    );

    return { updatedCount: tasks.length };
  },
});

export const backfillMissingArchivedAtOnAllTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    await Promise.all(
      tasks.map((task) => ctx.db.patch(task._id, { deletedAt: null })),
    );

    return { updatedCount: tasks.length };
  },
});

export async function fixLatestExecutionTimestamp(
  ctx: MutationCtx,
  taskId: Id<"maintenanceTasks">,
) {
  await ctx.db.patch(taskId, {
    lastExecutedAt: await findLatestExecutionTimestamp(ctx, taskId),
  });
}

export async function findLatestExecutionTimestamp(
  ctx: QueryCtx,
  taskId: Id<"maintenanceTasks">,
): Promise<number | null> {
  const latestExecution = await ctx.db
    .query("maintenanceExecutions")
    .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", taskId))
    .order("desc")
    .first();
  return latestExecution?.executedAt ?? null;
}
