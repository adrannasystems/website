import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  maintenanceTasks: defineTable({
    name: v.string(),
    periodHours: v.number(),
    lastExecutedAt: v.union(v.number(), v.null()),
    deletedAt: v.union(v.number(), v.null()),
    userId: v.string(),
  })
    .index('by_userId_deletedAt_name', ['userId', 'deletedAt', 'name']),
  maintenanceExecutions: defineTable({
    taskId: v.id('maintenanceTasks'),
    executedAt: v.number(),
  })
    .index('by_taskId', ['taskId'])
    .index('by_taskId_executedAt', ['taskId', 'executedAt']),
})
