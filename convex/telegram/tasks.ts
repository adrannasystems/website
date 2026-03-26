import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { MaintenanceTaskModelImpl, type MaintenanceTaskState } from "../MaintenanceTaskModel";
import { queryActiveTasksForUser } from "../maintenanceTaskQueries";
import type { Doc, Id } from "../_generated/dataModel";

type TaskSummary = {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
  state: MaintenanceTaskState;
  shared: boolean;
};

export const listTasks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<TaskSummary[]> => {
    const tasks = await queryActiveTasksForUser(ctx, args.userId);
    return tasks.map(toSummary);
  },
});

export const getDueTasks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<TaskSummary[]> => {
    const tasks = await queryActiveTasksForUser(ctx, args.userId);
    return tasks.map(toSummary).filter((t) => t.state !== "All Good");
  },
});

export const getSharedDueTasks = internalQuery({
  args: {},
  handler: async (ctx): Promise<TaskSummary[]> => {
    const sharedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_shared_deletedAt", (q) => q.eq("shared", true).eq("deletedAt", null))
      .collect();
    return sharedTasks.map(toSummary).filter((t) => t.state !== "All Good");
  },
});

function toSummary(doc: Doc<"maintenanceTasks">): TaskSummary {
  const model = new MaintenanceTaskModelImpl(doc);
  return {
    id: doc._id,
    name: model.name,
    periodHours: model.periodHours,
    lastExecutedAt: model.lastExecutedAt,
    state: model.state,
    shared: model.isShared,
  };
}
