import { internalMutation } from './_generated/server'
import { backfillMissingLastExecutedAt } from './repositories/maintenanceTasksRepo'

export const backfillMissingLastExecutedAtOnAllTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    return backfillMissingLastExecutedAt(ctx)
  },
})
