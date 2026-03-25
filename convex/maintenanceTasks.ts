import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUser } from "./auth";
import {
  MaintenanceTaskModelImpl,
  type MaintenanceTaskState,
  type MaintenanceTaskModel,
} from "./MaintenanceTaskModel";

export const listTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthenticatedUser(ctx);

    const activeTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_userId_deletedAt_name", (q) =>
        q.eq("userId", identity.subject).eq("deletedAt", null),
      )
      .order("asc")
      .collect();

    return Promise.all(
      activeTasks.map((taskData) =>
        toTaskWithState(new MaintenanceTaskModelImpl(taskData)),
      ),
    );
  },
});

export const listArchivedTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthenticatedUser(ctx);

    const archivedTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_userId_deletedAt_name", (q) =>
        q.eq("userId", identity.subject).gt("deletedAt", null),
      )
      .order("desc")
      .collect();

    return Promise.all(
      archivedTasks.map((taskData) =>
        toTaskWithState(new MaintenanceTaskModelImpl(taskData)),
      ),
    );
  },
});

export const createTask = mutation({
  args: {
    name: v.string(),
    periodHours: v.number(),
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
        userId: identity.subject,
      });
    }
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    name: v.string(),
    periodHours: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw new Error("Maintenance task not found");
    } else if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    } else if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    } else {
      await ctx.db.patch(args.taskId, {
        name: args.name,
        periodHours: args.periodHours,
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
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw new Error("Maintenance task not found");
    } else if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
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
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw new Error("Maintenance task not found");
    } else if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
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
    const task = await ctx.db.get(args.taskId);
    if (task === null || task.userId !== identity.subject) {
      throw new Error("Maintenance task not found");
    } else if (task.deletedAt === null) {
      throw new Error("Cannot permanently delete an active maintenance task");
    } else {
      const taskExecutions = await ctx.db
        .query("maintenanceExecutions")
        .withIndex("by_taskId", (query) => query.eq("taskId", task._id))
        .collect();

      await Promise.all(
        taskExecutions.map((execution) => ctx.db.delete(execution._id)),
      );
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

    const taskDbo = await ctx.db.get(args.taskId);
    if (taskDbo === null) {
      throw new Error("Maintenance task not found");
    } else if (taskDbo.userId !== identity.subject) {
      throw new Error("Unauthorized");
    } else {
      const task = new MaintenanceTaskModelImpl(taskDbo);
      if (task.isArchived) {
        throw new Error("Cannot add execution to an archived maintenance task");
      } else {
        const executionId = await ctx.db.insert("maintenanceExecutions", {
          taskId: task.id,
          executedAt: args.executedAt,
        });

        const lastExecutedAt = await task.lastExecutedAt();

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
    const execution = await ctx.db.get(args.executionId);
    if (execution === null) {
      throw new Error("Maintenance execution not found");
    } else {
      const task = await ctx.db.get(execution.taskId);
      if (task === null || task.userId !== identity.subject) {
        throw new Error("Maintenance execution not found");
      }
      await ctx.db.delete(args.executionId);

      const latestExecution = await ctx.db
        .query("maintenanceExecutions")
        .withIndex("by_taskId_executedAt", (query) =>
          query.eq("taskId", execution.taskId),
        )
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
    const task = await ctx.db.get(args.taskId);
    if (task === null || task.userId !== identity.subject) {
      throw new Error("Maintenance task not found");
    }
    const executions = await ctx.db
      .query("maintenanceExecutions")
      .withIndex("by_taskId_executedAt", (query) =>
        query.eq("taskId", args.taskId),
      )
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

async function toTaskWithState(task: MaintenanceTaskModel): Promise<{
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
  state: MaintenanceTaskState;
  periodsDue: number;
}> {
  return {
    id: task.id,
    name: task.name,
    periodHours: task.periodHours,
    lastExecutedAt: await task.lastExecutedAt(),
    state: await task.state(),
    periodsDue: await task.periodsDue(),
  };
}
