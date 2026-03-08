import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type MaintenanceTaskRecord = {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  lastExecutedAt: number | null;
};

export type MaintenanceExecutionRecord = {
  id: Id<"maintenanceExecutions">;
  taskId: Id<"maintenanceTasks">;
  executedAt: number;
};

export async function listTasks(
  ctx: QueryCtx,
): Promise<MaintenanceTaskRecord[]> {
  const tasks = await ctx.db.query("maintenanceTasks").collect();

  const normalizedTasks = await Promise.all(
    tasks.map(async (task) => {

      return {
        id: task._id,
        name: task.name,
        periodHours: task.periodHours,
        lastExecutedAt: task.lastExecutedAt === undefined
          ? await deriveLatestExecutionTimestamp(ctx, task._id)
          : task.lastExecutedAt,
      };
    }),
  );

  return normalizedTasks;
}

export async function backfillMissingLastExecutedAt(ctx: MutationCtx) {
  const tasks = await ctx.db
    .query("maintenanceTasks")
    .filter((q) => q.eq(q.field("lastExecutedAt"), undefined))
    .collect();

  for (const task of tasks) {
    await ctx.db.patch(task._id, {
      lastExecutedAt: await findLatestExecutionTimestamp(
        ctx,
        task._id
      ),
    });
  }

  return { updatedCount: tasks.length };
}

export async function createTask(
  ctx: MutationCtx,
  input: { name: string; periodHours: number },
) {
  return ctx.db.insert("maintenanceTasks", {
    name: input.name,
    periodHours: input.periodHours,
    lastExecutedAt: null,
  });
}

export async function updateTask(
  ctx: MutationCtx,
  input: { taskId: Id<"maintenanceTasks">; name: string; periodHours: number },
) {
  await ctx.db.patch(input.taskId, {
    name: input.name,
    periodHours: input.periodHours,
  });
}

export async function deleteTask(
  ctx: MutationCtx,
  taskId: Id<"maintenanceTasks">,
) {
  const executions = await ctx.db
    .query("maintenanceExecutions")
    .withIndex("by_taskId", (query) => query.eq("taskId", taskId))
    .collect();

  await Promise.all(
    executions.map(async (execution) => ctx.db.delete(execution._id)),
  );
  await ctx.db.delete(taskId);
}

export async function addExecution(
  ctx: MutationCtx,
  input: { taskId: Id<"maintenanceTasks">; executedAt: number },
) {
  const task = await ctx.db.get(input.taskId);
  if (task === null) {
    throw new Error("Maintenance task not found");
  }

  const executionId = await ctx.db.insert("maintenanceExecutions", {
    taskId: input.taskId,
    executedAt: input.executedAt,
  });

  const taskLastExecutedAt = task.lastExecutedAt ?? null;
  if (taskLastExecutedAt === null || input.executedAt > taskLastExecutedAt) {
    await ctx.db.patch(input.taskId, {
      lastExecutedAt: input.executedAt,
    });
  }

  return executionId;
}

export async function deleteExecution(
  ctx: MutationCtx,
  executionId: Id<"maintenanceExecutions">,
) {
  const execution = await ctx.db.get(executionId);
  if (execution === null) {
    throw new Error("Maintenance execution not found");
  }

  await ctx.db.delete(executionId);

  const task = await ctx.db.get(execution.taskId);
  if (task === null) {
    return { taskId: execution.taskId };
  }

  const taskLastExecutedAt = task.lastExecutedAt ?? null;
  if (taskLastExecutedAt === execution.executedAt) {
    const latestExecutionTimestamp = await findLatestExecutionTimestamp(
      ctx,
      execution.taskId,
    );
    await ctx.db.patch(execution.taskId, {
      lastExecutedAt: latestExecutionTimestamp,
    });
  }

  return { taskId: execution.taskId };
}

export async function listExecutions(
  ctx: QueryCtx,
  taskId: Id<"maintenanceTasks">,
): Promise<MaintenanceExecutionRecord[]> {
  const executions = await ctx.db
    .query("maintenanceExecutions")
    .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", taskId))
    .order("desc")
    .collect();

  return executions.map((execution) => {
    return {
      id: execution._id,
      taskId: execution.taskId,
      executedAt: execution.executedAt,
    };
  });
}

async function findLatestExecutionTimestamp(
  ctx: MutationCtx,
  taskId: Id<"maintenanceTasks">,
): Promise<number | null> {
  const latestExecution = await ctx.db
    .query("maintenanceExecutions")
    .withIndex("by_taskId_executedAt", (query) => query.eq("taskId", taskId))
    .order("desc")
    .first();

  return latestExecution?.executedAt ?? null;
}

async function deriveLatestExecutionTimestamp(
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
