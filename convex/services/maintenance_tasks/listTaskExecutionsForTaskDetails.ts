import type { Id } from '../../_generated/dataModel'
import type { QueryCtx } from '../../_generated/server'
import { listExecutions } from '../../repositories/maintenanceTasksRepo'

export type MaintenanceExecutionForTaskDetails = {
  id: Id<'maintenanceExecutions'>
  executedAt: number
}

export async function listTaskExecutionsForTaskDetails(
  ctx: QueryCtx,
  taskId: Id<'maintenanceTasks'>,
): Promise<MaintenanceExecutionForTaskDetails[]> {
  const executions = await listExecutions(ctx, taskId)

  return executions.map((execution) => {
    return {
      id: execution.id,
      executedAt: execution.executedAt,
    }
  })
}
