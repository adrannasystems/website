import type { QueryCtx } from '../../_generated/server'
import { listTasks } from '../../repositories/maintenanceTasksRepo'
import {
  sortTasksByUrgency,
  toTaskWithState,
  type MaintenanceTaskForOverview,
} from './taskStateShared'

export async function listTasksForMaintenanceOverview(
  ctx: QueryCtx,
): Promise<MaintenanceTaskForOverview[]> {
  const tasks = await listTasks(ctx)

  return sortTasksByUrgency(tasks.map(toTaskWithState))
}
