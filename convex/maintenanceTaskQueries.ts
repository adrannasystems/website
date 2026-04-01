import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export async function queryActiveTasksForUser(
  ctx: QueryCtx,
  userId: string,
): Promise<Doc<"maintenanceTasks">[]> {
  const myTasks = await ctx.db
    .query("maintenanceTasks")
    .withIndex("by_userId_deletedAt_name", (q) => q.eq("userId", userId).eq("deletedAt", null))
    .collect();

  const sharedTasks = await ctx.db
    .query("maintenanceTasks")
    .withIndex("by_shared_deletedAt", (q) => q.eq("shared", true).eq("deletedAt", null))
    .collect();

  const myTaskIds = new Set(myTasks.map((t) => t._id));
  const otherShared = sharedTasks.filter((t) => !myTaskIds.has(t._id));

  return [...myTasks, ...otherShared];
}
