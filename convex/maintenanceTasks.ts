import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { createUnauthorizedError, authedUserIdOrThrow } from "./auth";
import { MaintenanceTaskModelImpl, type MaintenanceTaskState } from "./MaintenanceTaskModel";
import { queryActiveTasksForUser } from "./maintenanceTaskQueries";

export const listTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await authedUserIdOrThrow(ctx);
    const allTasks = await queryActiveTasksForUser(ctx, userId);
    return allTasks.map(toTaskWithState);
  },
});

export const listArchivedTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await authedUserIdOrThrow(ctx);
    const archivedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_userId_deletedAt_name", (q) => q.eq("userId", userId).gt("deletedAt", null))
      .order("desc")
      .collect();
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
    const userId = await authedUserIdOrThrow(ctx);
    return createTaskImpl(ctx, userId, args.name, args.periodHours, args.shared === true);
  },
});

export const createTaskForUser = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    periodHours: v.number(),
    shared: v.optional(v.boolean()),
  },
  handler: (ctx, args) =>
    createTaskImpl(ctx, args.userId, args.name, args.periodHours, args.shared === true),
});

export const updateTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    name: v.string(),
    periodHours: v.number(),
    shared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    } else {
      const becomingShared = args.shared === true && task.shared !== true;
      const now = Date.now();
      await ctx.db.patch(args.taskId, {
        name: args.name,
        periodHours: args.periodHours,
        shared: args.shared === true,
        ...(becomingShared ? { lastSharedAt: now } : {}),
      });
      if (becomingShared) {
        // For the user doing the sharing, acknowledge the new lastSharedAt so their
        // own position doesn't reset to the top — only other users' positions reset.
        const existingPosition = await ctx.db
          .query("taskUserPositions")
          .withIndex("by_userId_taskId", (q) => q.eq("userId", userId).eq("taskId", args.taskId))
          .first();
        if (existingPosition !== null) {
          await ctx.db.patch(existingPosition._id, { lastPositionedAt: now });
        }
      }
    }
  },
});

export const archiveTask = mutation({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);
    return archiveTaskImpl(ctx, userId, args.taskId);
  },
});

export const archiveTaskForUser = internalMutation({
  args: {
    userId: v.string(),
    taskId: v.id("maintenanceTasks"),
  },
  handler: (ctx, args) => archiveTaskImpl(ctx, args.userId, args.taskId),
});

export const unarchiveTask = mutation({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else {
      await ctx.db.patch(args.taskId, { deletedAt: null });
    }
  },
});

export const deleteArchivedTaskPermanently = mutation({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);
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
    const userId = await authedUserIdOrThrow(ctx);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else if (new MaintenanceTaskModelImpl(task).isArchived) {
      throw new Error("Cannot add execution to an archived maintenance task");
    } else {
      return logExecutionImpl(ctx, args.taskId, args.executedAt);
    }
  },
});

export const logExecutionForUser = internalMutation({
  args: {
    userId: v.string(),
    taskId: v.id("maintenanceTasks"),
    executedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (task?.deletedAt !== null) {
      throw createMaintenanceTaskNotFoundError();
    } else if (task.userId !== args.userId && task.shared !== true) {
      throw createUnauthorizedError();
    } else {
      await logExecutionImpl(ctx, args.taskId, args.executedAt ?? Date.now());
    }
  },
});

export const deleteExecution = mutation({
  args: { executionId: v.id("maintenanceExecutions") },
  handler: async (ctx, args): Promise<void> => {
    const userId = await authedUserIdOrThrow(ctx);
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
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"maintenanceExecutions">; executedAt: number }[]> => {
    const userId = await authedUserIdOrThrow(ctx);
    const task = await ctx.db.get(args.taskId);
    if (task === null || (task.userId !== userId && task.shared !== true)) {
      throw createMaintenanceTaskNotFoundError();
    }
    const executions = await ctx.db
      .query("maintenanceExecutions")
      .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", args.taskId))
      .order("desc")
      .collect();
    return executions.map((execution) => ({ id: execution._id, executedAt: execution.executedAt }));
  },
});

async function createTaskImpl(
  ctx: MutationCtx,
  userId: string,
  name: string,
  periodHours: number,
  shared: boolean,
): Promise<Id<"maintenanceTasks">> {
  if (periodHours <= 0) {
    throw new Error("periodHours must be greater than 0");
  }
  return ctx.db.insert("maintenanceTasks", {
    name,
    periodHours,
    lastExecutedAt: null,
    deletedAt: null,
    userId,
    shared,
    ...(shared ? { lastSharedAt: Date.now() } : {}),
  });
}

async function archiveTaskImpl(
  ctx: MutationCtx,
  userId: string,
  taskId: Id<"maintenanceTasks">,
): Promise<void> {
  const task = await ctx.db.get(taskId);
  if (task === null) {
    throw createMaintenanceTaskNotFoundError();
  } else if (task.userId !== userId && task.shared !== true) {
    throw createUnauthorizedError();
  } else {
    await ctx.db.patch(taskId, { deletedAt: Date.now() });
  }
}

async function logExecutionImpl(
  ctx: MutationCtx,
  taskId: Id<"maintenanceTasks">,
  executedAt: number,
): Promise<Id<"maintenanceExecutions">> {
  const executionId = await ctx.db.insert("maintenanceExecutions", { taskId, executedAt });
  const task = await ctx.db.get(taskId);
  if (task !== null && (task.lastExecutedAt === null || executedAt > task.lastExecutedAt)) {
    await ctx.db.patch(taskId, { lastExecutedAt: executedAt });
  }
  return executionId;
}

function toTaskWithState(taskData: Doc<"maintenanceTasks">): {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
  state: MaintenanceTaskState;
  periodsDue: number;
  shared: boolean;
  lastSharedAt: number | undefined;
} {
  const task = new MaintenanceTaskModelImpl(taskData);
  return {
    id: task.id,
    name: task.name,
    periodHours: task.periodHours,
    lastExecutedAt: task.lastExecutedAt,
    state: task.state,
    periodsDue: task.periodsDue,
    shared: taskData.shared === true,
    lastSharedAt: taskData.lastSharedAt ?? undefined,
  };
}

export const getMyTaskPositions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await authedUserIdOrThrow(ctx);
    const positions = await ctx.db
      .query("taskUserPositions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return positions.map((p) => ({
      taskId: p.taskId,
      position: p.position,
      lastPositionedAt: p.lastPositionedAt,
    }));
  },
});

export const reorderTasks = mutation({
  args: { orderedTaskIds: v.array(v.id("maintenanceTasks")) },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);
    const now = Date.now();
    let position = 0;
    for (const taskId of args.orderedTaskIds) {
      const existing = await ctx.db
        .query("taskUserPositions")
        .withIndex("by_userId_taskId", (q) => q.eq("userId", userId).eq("taskId", taskId))
        .first();
      const record = { position: position * 1000, lastPositionedAt: now };
      if (existing !== null) {
        await ctx.db.patch(existing._id, record);
      } else {
        await ctx.db.insert("taskUserPositions", { userId, taskId, ...record });
      }
      position++;
    }
  },
});

function createMaintenanceTaskNotFoundError() {
  return new Error("Maintenance task not found");
}
