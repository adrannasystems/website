import { v } from 'convex/values'
import { internalQuery, mutation, query } from './_generated/server'
import { requireAuthenticatedUser } from './auth'
import {
  addExecution as addExecutionInRepository,
  createTask as createTaskInRepository,
  deleteExecution as deleteExecutionInRepository,
  deleteTask as deleteTaskInRepository,
  updateTask as updateTaskInRepository,
} from './repositories/maintenanceTasksRepo'
import {
  listDueOrMoreUrgentTasksForNotifications as listDueOrMoreUrgentTasksForNotificationsInService,
  listTaskExecutionsForTaskDetails,
  listTasksForMaintenanceOverview as listTasksForMaintenanceOverviewInService,
} from './services/maintenance_tasks'

export const listTasksForMaintenanceOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx)

    return listTasksForMaintenanceOverviewInService(ctx)
  },
})

export const findAllTasksByDueDateDesc = listTasksForMaintenanceOverview

export const listDueOrMoreUrgentTasksForNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    return listDueOrMoreUrgentTasksForNotificationsInService(ctx)
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
      return createTaskInRepository(ctx, args)
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
      await updateTaskInRepository(ctx, args)
    }
  },
})

export const deleteTask = mutation({
  args: {
    taskId: v.id('maintenanceTasks'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)
    await deleteTaskInRepository(ctx, args.taskId)
  },
})

export const addExecution = mutation({
  args: {
    taskId: v.id('maintenanceTasks'),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)
    return addExecutionInRepository(ctx, args)
  },
})

export const deleteExecution = mutation({
  args: {
    executionId: v.id('maintenanceExecutions'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)
    return deleteExecutionInRepository(ctx, args.executionId)
  },
})

export const findTaskExecutions = query({
  args: {
    taskId: v.id('maintenanceTasks'),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)

    return listTaskExecutionsForTaskDetails(ctx, args.taskId)
  },
})
