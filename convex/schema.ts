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
    shared: v.optional(v.boolean()),
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
  telegramUsers: defineTable({
    chatId: v.string(),
  }).index("by_chatId", ["chatId"]),
});
