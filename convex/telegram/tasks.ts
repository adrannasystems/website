import { v } from "convex/values";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { MaintenanceTaskModelImpl, type MaintenanceTaskState } from "../MaintenanceTaskModel";
import type { Doc, Id } from "../_generated/dataModel";

type TaskSummary = {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
  state: MaintenanceTaskState;
  shared: boolean;
};

function toSummary(doc: Doc<"maintenanceTasks">): TaskSummary {
  const model = new MaintenanceTaskModelImpl(doc);
  return {
    id: doc._id,
    name: doc.name,
    periodHours: doc.periodHours,
    lastExecutedAt: doc.lastExecutedAt,
    state: model.state(),
    shared: doc.shared === true,
  };
}

async function getActiveTasks(ctx: QueryCtx, userId: string): Promise<Doc<"maintenanceTasks">[]> {
  const myTasks = await ctx.db
    .query("maintenanceTasks")
    .withIndex("by_userId_deletedAt_name", (q) => q.eq("userId", userId).eq("deletedAt", null))
    .take(100);

  const sharedTasks = await ctx.db
    .query("maintenanceTasks")
    .withIndex("by_shared_deletedAt", (q) => q.eq("shared", true).eq("deletedAt", null))
    .take(100);

  const myTaskIds = new Set(myTasks.map((t) => t._id));
  const otherShared = sharedTasks.filter((t) => !myTaskIds.has(t._id));

  return [...myTasks, ...otherShared].sort((a, b) => a.name.localeCompare(b.name));
}

export const listTasks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<TaskSummary[]> => {
    const tasks = await getActiveTasks(ctx, args.userId);
    return tasks.map(toSummary);
  },
});

export const getDueTasks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<TaskSummary[]> => {
    const tasks = await getActiveTasks(ctx, args.userId);
    return tasks.map(toSummary).filter((t) => t.state !== "All Good");
  },
});

export const getSharedDueTasks = internalQuery({
  args: {},
  handler: async (ctx): Promise<TaskSummary[]> => {
    const sharedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_shared_deletedAt", (q) => q.eq("shared", true).eq("deletedAt", null))
      .take(100);
    return sharedTasks.map(toSummary).filter((t) => t.state !== "All Good");
  },
});

export const createTask = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    periodHours: v.number(),
    shared: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<"maintenanceTasks">> => {
    if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    }
    return ctx.db.insert("maintenanceTasks", {
      name: args.name,
      periodHours: args.periodHours,
      lastExecutedAt: null,
      deletedAt: null,
      userId: args.userId,
      shared: args.shared === true,
    });
  },
});

export const logExecution = internalMutation({
  args: {
    userId: v.string(),
    taskId: v.id("maintenanceTasks"),
    executedAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = args.userId;
    const task = await ctx.db.get(args.taskId);
    if (task?.deletedAt !== null) {
      throw new Error("Task not found");
    }
    if (task.userId !== userId && task.shared !== true) {
      throw new Error("Unauthorized");
    }
    const executedAt = args.executedAt ?? Date.now();
    await ctx.db.insert("maintenanceExecutions", {
      taskId: args.taskId,
      executedAt,
    });
    if (task.lastExecutedAt === null || executedAt > task.lastExecutedAt) {
      await ctx.db.patch(args.taskId, { lastExecutedAt: executedAt });
    }
  },
});

export const archiveTask = internalMutation({
  args: {
    userId: v.string(),
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = args.userId;
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw new Error("Task not found");
    }
    if (task.userId !== userId && task.shared !== true) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.taskId, { deletedAt: Date.now() });
  },
});
