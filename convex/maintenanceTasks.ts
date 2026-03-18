import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUser } from "./auth";
import { fixLatestExecutionTimestamp } from "./maintenanceTaskMigrations";
import {
  MaintenanceTaskModelImpl,
  type MaintenanceTaskState,
  type MaintenanceTaskModel,
} from "./MaintenanceTaskModel";

export const listTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const activeTasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) =>
        q.or(
          q.eq(q.field("deletedAt"), null),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const tasksWithState = await Promise.all(
      activeTasks.map((taskData) =>
        toTaskWithState(new MaintenanceTaskModelImpl(ctx, taskData)),
      ),
    );
    return sortedByPeriodsDueAndName(tasksWithState);
  },
});

export const listDeletedTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const deletedTasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), null),
          q.neq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const tasksWithState = await Promise.all(
      deletedTasks.map((taskData) =>
        toTaskWithState(new MaintenanceTaskModelImpl(ctx, taskData)),
      ),
    );
    return sortedByPeriodsDueAndName(tasksWithState);
  },
});

function sortedByPeriodsDueAndName<
  T extends { periodsDue: number; name: string },
>(tasks: T[]): T[] {
  return [...tasks].sort((left, right) => {
    if (left.periodsDue === right.periodsDue) {
      return left.name.localeCompare(right.name);
    } else {
      return right.periodsDue - left.periodsDue;
    }
  });
}

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
    await requireAuthenticatedUser(ctx);

    if (args.periodHours <= 0) {
      throw new Error("periodHours must be greater than 0");
    } else {
      await ctx.db.patch(args.taskId, {
        name: args.name,
        periodHours: args.periodHours,
      });
    }
  },
});

export const deleteTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (task === null) {
      throw new Error("Maintenance task not found");
    } else {
      await ctx.db.patch(args.taskId, {
        deletedAt: Date.now(),
      });
    }
  },
});

export const undeleteTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.patch(args.taskId, {
      deletedAt: null,
    });
  },
});

export const addExecution = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const taskDbo = await ctx.db.get(args.taskId);
    if (taskDbo === null) {
      throw new Error("Maintenance task not found");
    } else {
      const task = new MaintenanceTaskModelImpl(ctx, taskDbo);
      if (task.isDeleted) {
        throw new Error("Cannot add execution to a deleted maintenance task");
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
    await requireAuthenticatedUser(ctx);
    const execution = await ctx.db.get(args.executionId);
    if (execution === null) {
      throw new Error("Maintenance execution not found");
    } else {
      await ctx.db.delete(args.executionId);

      await fixLatestExecutionTimestamp(ctx, execution.taskId);
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
    await requireAuthenticatedUser(ctx);
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
