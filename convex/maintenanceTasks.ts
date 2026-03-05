import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireAuthenticatedUser } from './auth'

export const findAllTasksByDueDateDesc = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx)

    const tasks = await ctx.db.query('maintenanceTasks').collect()
    const tasksWithState = await Promise.all(
      tasks.map(async (task) => {
        const lastExecution = await getLatestExecution(ctx, task._id)
        const state = computeTaskState(task.periodHours, lastExecution?.executedAt)

        return {
          id: task._id,
          name: task.name,
          periodHours: task.periodHours,
          lastExecutedAt: lastExecution?.executedAt ?? null,
          state: state.name,
          periodsDue: state.periodsDue,
        }
      }),
    )

    return tasksWithState.sort((left, right) => {
      const leftScore = getStateSortScore(left.state)
      const rightScore = getStateSortScore(right.state)

      if (leftScore !== rightScore) {
        return leftScore - rightScore
      } else if (left.periodsDue === null && right.periodsDue === null) {
        return left.name.localeCompare(right.name)
      } else if (left.periodsDue === null) {
        return -1
      } else if (right.periodsDue === null) {
        return 1
      } else if (left.periodsDue !== right.periodsDue) {
        return right.periodsDue - left.periodsDue
      } else {
        return left.name.localeCompare(right.name)
      }
    })
  },
})

export const createTask = mutation({
  args: {
    name: v.string(),
    periodHours: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    if (args.periodHours <= 0) {
      throw new Error('periodHours must be greater than 0')
    } else {
      return ctx.db.insert('maintenanceTasks', {
        name: args.name,
        periodHours: args.periodHours,
      })
    }
  },
})

export const updateTask = mutation({
  args: {
    taskId: v.id('maintenanceTasks'),
    name: v.string(),
    periodHours: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    if (args.periodHours <= 0) {
      throw new Error('periodHours must be greater than 0')
    } else {
      await ctx.db.patch(args.taskId, {
        name: args.name,
        periodHours: args.periodHours,
      })
    }
  },
})

export const deleteTask = mutation({
  args: {
    taskId: v.id('maintenanceTasks'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    const executions = await ctx.db
      .query('maintenanceExecutions')
      .withIndex('by_taskId', (query) => query.eq('taskId', args.taskId))
      .collect()

    await Promise.all(executions.map(async (execution) => ctx.db.delete(execution._id)))
    await ctx.db.delete(args.taskId)
  },
})

export const addExecution = mutation({
  args: {
    taskId: v.id('maintenanceTasks'),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    await ctx.db.insert('maintenanceExecutions', {
      taskId: args.taskId,
      executedAt: args.executedAt,
    })
  },
})

export const deleteExecution = mutation({
  args: {
    executionId: v.id('maintenanceExecutions'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    await ctx.db.delete(args.executionId)
  },
})

export const findTaskExecutions = query({
  args: {
    taskId: v.id('maintenanceTasks'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    const executions = await ctx.db
      .query('maintenanceExecutions')
      .withIndex('by_taskId_executedAt', (query) => query.eq('taskId', args.taskId))
      .order('desc')
      .collect()

    return executions.map((execution) => ({
      id: execution._id,
      executedAt: execution.executedAt,
    }))
  },
})

function computeTaskState(periodHours: number, lastExecutedAt: number | undefined) {
  if (lastExecutedAt === undefined) {
    return {
      name: 'Never Done',
      periodsDue: null,
    }
  } else {
    const periodMilliseconds = periodHours * 60 * 60 * 1000
    const elapsedMilliseconds = Date.now() - lastExecutedAt
    const periodsDue = elapsedMilliseconds / periodMilliseconds

    if (periodsDue < 1) {
      return {
        name: 'All Good',
        periodsDue,
      }
    } else if (periodsDue > 2) {
      return {
        name: 'Overdue',
        periodsDue,
      }
    } else {
      return {
        name: 'Due',
        periodsDue,
      }
    }
  }
}

async function getLatestExecution(
  ctx: QueryCtx,
  taskId: Id<'maintenanceTasks'>,
): Promise<{ _id: Id<'maintenanceExecutions'>; executedAt: number } | null> {
  const execution = await ctx.db
    .query('maintenanceExecutions')
    .withIndex('by_taskId_executedAt', (query) =>
      query.eq('taskId', taskId),
    )
    .order('desc')
    .first()

  return execution === null
    ? null
    : {
        _id: execution._id,
        executedAt: execution.executedAt,
      }
}

function getStateSortScore(state: string) {
  if (state === 'Overdue') {
    return 0
  } else if (state === 'Due') {
    return 1
  } else if (state === 'Never Done') {
    return 2
  } else {
    return 3
  }
}
