import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { createUnauthorizedError, databaseUserId, requireAuthenticatedUser } from "./auth";
import { MaintenanceTaskModelImpl, type MaintenanceTaskState } from "./MaintenanceTaskModel";

export const listTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);

    const myTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_userId_deletedAt_name", (q) => q.eq("userId", userId).eq("deletedAt", null))
      .order("asc")
      .take(100);

    const sharedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_shared_deletedAt", (q) => q.eq("shared", true).eq("deletedAt", null))
      .take(100);

    const myTaskIds = new Set(myTasks.map((t) => t._id));
    const otherSharedTasks = sharedTasks.filter((t) => !myTaskIds.has(t._id));

    const allTasks = [...myTasks, ...otherSharedTasks].sort((a, b) => a.name.localeCompare(b.name));

    return allTasks.map(toTaskWithState);
  },
});

export const listArchivedTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);

    const archivedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_userId_deletedAt_name", (q) => q.eq("userId", userId).gt("deletedAt", null))
      .order("desc")
      .take(100);

    return archivedTasks.map(toTaskWithState);
  },
});

export const createTask = mutation({
  args: {
    name: v.string(),
    periodHours: v.number(),
    shared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);

    if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    } else {
      return ctx.db.insert("maintenanceTasks", {
        name: args.name,
        periodHours: args.periodHours,
        lastExecutedAt: null,
        deletedAt: null,
        userId: databaseUserId(identity),
        shared: args.shared === true,
      });
    }
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    name: v.string(),
    periodHours: v.number(),
    shared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);

    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    } else {
      await ctx.db.patch(args.taskId, {
        name: args.name,
        periodHours: args.periodHours,
        shared: args.shared === true,
      });
    }
  },
});

export const archiveTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else {
      await ctx.db.patch(args.taskId, {
        deletedAt: Date.now(),
      });
    }
  },
});

export const unarchiveTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else {
      await ctx.db.patch(args.taskId, {
        deletedAt: null,
      });
    }
  },
});

export const deleteArchivedTaskPermanently = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else if (task.deletedAt === null) {
      throw new Error("Cannot permanently delete an active maintenance task");
    } else {
      const taskExecutions = await ctx.db
        .query("maintenanceExecutions")
        .withIndex("by_taskId", (query) => query.eq("taskId", task._id))
        .collect();

      await Promise.all(taskExecutions.map((execution) => ctx.db.delete(execution._id)));
      await ctx.db.delete(task._id);
    }
  },
});

export const addExecution = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);

    const taskDbo = await ctx.db.get(args.taskId);
    if (taskDbo === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (taskDbo.userId !== userId && taskDbo.shared !== true) {
      throw createUnauthorizedError();
    } else {
      const task = new MaintenanceTaskModelImpl(taskDbo);
      if (task.isArchived) {
        throw new Error("Cannot add execution to an archived maintenance task");
      } else {
        const executionId = await ctx.db.insert("maintenanceExecutions", {
          taskId: task.id,
          executedAt: args.executedAt,
        });

        const lastExecutedAt = task.lastExecutedAt();

        if (lastExecutedAt === null || args.executedAt > lastExecutedAt) {
          await ctx.db.patch(task.id, { lastExecutedAt: args.executedAt });
        }

        return executionId;
      }
    }
  },
});

export const deleteExecution = mutation({
  args: {
    executionId: v.id("maintenanceExecutions"),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);
    const execution = await ctx.db.get(args.executionId);
    if (execution === null) {
      throw new Error("Maintenance execution not found");
    } else {
      const task = await ctx.db.get(execution.taskId);
      if (task === null || (task.userId !== userId && task.shared !== true)) {
        throw new Error("Maintenance execution not found");
      }
      await ctx.db.delete(args.executionId);

      const latestExecution = await ctx.db
        .query("maintenanceExecutions")
        .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", execution.taskId))
        .order("desc")
        .first();
      await ctx.db.patch(execution.taskId, {
        lastExecutedAt: latestExecution?.executedAt ?? null,
      });
    }
  },
});

export const findTaskExecutions = query({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      id: Id<"maintenanceExecutions">;
      executedAt: number;
    }[]
  > => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);
    const task = await ctx.db.get(args.taskId);
    if (task === null || (task.userId !== userId && task.shared !== true)) {
      throw createMaintenanceTaskNotFoundError();
    }
    const executions = await ctx.db
      .query("maintenanceExecutions")
      .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    return executions.map((execution) => {
      return {
        id: execution._id,
        executedAt: execution.executedAt,
      };
    });
  },
});

function toTaskWithState(taskData: Doc<"maintenanceTasks">): {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
  state: MaintenanceTaskState;
  periodsDue: number;
  shared: boolean;
} {
  const task = new MaintenanceTaskModelImpl(taskData);
  return {
    id: task.id,
    name: task.name,
    periodHours: task.periodHours,
    lastExecutedAt: task.lastExecutedAt(),
    state: task.state(),
    periodsDue: task.periodsDue(),
    shared: taskData.shared === true,
  };
}

export const generateTelegramLinkToken = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await requireAuthenticatedUser(ctx);
    const userId = databaseUserId(identity);

    const existing = await ctx.db
      .query("telegramLinkTokens")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    await Promise.all(existing.map((t) => ctx.db.delete(t._id)));

    const token = generateToken();
    await ctx.db.insert("telegramLinkTokens", {
      token,
      userId,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return token;
  },
});

function createMaintenanceTaskNotFoundError() {
  return new Error("Maintenance task not found");
}

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * One-time migration: backfill `shared: false` on all existing tasks that
 * were created before the field was added. Safe to run multiple times.
 * Delete this mutation after running it on production.
 */
export const backfillSharedField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("maintenanceTasks").withIndex("by_deletedAt").take(500);

    const unset = tasks.filter((t) => t.shared === undefined);
    await Promise.all(unset.map((t) => ctx.db.patch(t._id, { shared: false })));

    return { patched: unset.length };
  },
});
