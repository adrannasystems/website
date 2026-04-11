import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  maintenanceTasks: defineTable({
    name: v.string(),
    periodHours: v.number(),
    lastExecutedAt: v.union(v.number(), v.null()),
    deletedAt: v.union(v.number(), v.null()),
    /** Convex auth: `identity.tokenIdentifier` (`issuer|subject`). */
    userId: v.string(),
    /** When true, all authenticated users can view and interact with this task. */
    shared: v.boolean(),
    /** Timestamp of the last transition from shared=false to shared=true. Never cleared on unshare. Used for re-share detection. */
    lastSharedAt: v.optional(v.number()),
    /** When false, no notifications are sent for this task. Undefined (existing tasks) means enabled. */
    notificationsEnabled: v.optional(v.boolean()),
  })
    .index("by_userId_deletedAt_name", ["userId", "deletedAt", "name"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_shared_deletedAt", ["shared", "deletedAt"]),
  maintenanceExecutions: defineTable({
    taskId: v.id("maintenanceTasks"),
    executedAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_taskId_executedAt", ["taskId", "executedAt"]),
  taskUserPositions: defineTable({
    userId: v.string(),
    taskId: v.id("maintenanceTasks"),
    /** Ascending order — lower = higher in the list. */
    position: v.number(),
    /** The task.lastSharedAt value at the time the user last positioned this task. */
    lastPositionedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_taskId", ["userId", "taskId"]),
  telegramChats: defineTable({
    chatId: v.string(),
    userId: v.optional(v.string()),
  })
    .index("by_chatId", ["chatId"])
    .index("by_userId", ["userId"]),
});
