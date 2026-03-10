import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";

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
