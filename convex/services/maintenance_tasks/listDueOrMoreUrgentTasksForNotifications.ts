import type { QueryCtx } from '../../_generated/server'
import { listTasks } from '../../repositories/maintenanceTasksRepo'
import {
  type MaintenanceTaskForOverview,
  sortTasksByUrgency,
  toTaskWithState,
} from './taskStateShared'

export async function listDueOrMoreUrgentTasksForNotifications(
  ctx: QueryCtx,
): Promise<MaintenanceTaskForOverview[]> {
  const tasks = await listTasks(ctx)
  const tasksForNotifications = sortTasksByUrgency(tasks.map(toTaskWithState))

  return tasksForNotifications.filter((task) => {
    return task.state === 'Due' || task.state === 'Overdue'
  })
}
