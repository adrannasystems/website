import type { Id } from '../../_generated/dataModel'
import type { MaintenanceTaskRecord } from '../../repositories/maintenanceTasksRepo'

export type MaintenanceTaskState = 'All Good' | 'Due' | 'Overdue' | 'Never Done'

export type MaintenanceTaskForOverview = {
  id: Id<'maintenanceTasks'>
  name: string
  periodHours: number
  lastExecutedAt: number | null
  state: MaintenanceTaskState
  periodsDue: number
}

export function toTaskWithState(task: MaintenanceTaskRecord): MaintenanceTaskForOverview {
  const periodsDue = calculatePeriodsDue(task.periodHours, task.lastExecutedAt)
  const state = taskStateFromPeriodsDue(periodsDue)

  return {
    id: task.id,
    name: task.name,
    periodHours: task.periodHours,
    lastExecutedAt: task.lastExecutedAt,
    state,
    periodsDue,
  }
}

export function sortTasksByUrgency(tasks: MaintenanceTaskForOverview[]) {
  return [...tasks].sort((left, right) => {
    if (left.periodsDue === right.periodsDue) {
      return left.name.localeCompare(right.name)
    } else {
      return right.periodsDue - left.periodsDue
    }
  })
}

function taskStateFromPeriodsDue(periodsDue: number): MaintenanceTaskState {
  if (periodsDue === Number.POSITIVE_INFINITY) {
    return 'Never Done'
  } else if (periodsDue < 1) {
    return 'All Good'
  } else if (periodsDue < 2) {
    return 'Due'
  } else {
    return 'Overdue'
  }
}

function calculatePeriodsDue(periodHours: number, lastExecutedAt: number | null) {
  if (lastExecutedAt === null) {
    return Number.POSITIVE_INFINITY
  } else {
    const periodMilliseconds = periodHours * 60 * 60 * 1000
    const elapsedMilliseconds = Date.now() - lastExecutedAt

    return elapsedMilliseconds / periodMilliseconds
  }
}
