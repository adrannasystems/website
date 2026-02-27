import { queryOpenTasks } from '../src/notion-open-tasks'
import type { TaskItem } from '../src/TaskItem'

const TIME_ZONE = 'Europe/Zurich'
const START_HOUR = 12
const END_HOUR = 22

async function main() {
  const ntfyTopic = requireEnv('NTFY_TOPIC')

  const now = new Date()
  const localHour = getHourInTimeZone(now, TIME_ZONE)
  const localDate = formatDateInTimeZone(now, TIME_ZONE)

  if (localHour < START_HOUR || localHour > END_HOUR) {
    console.log(
      `Skipping reminders outside window (${String(localHour)}:00 ${TIME_ZONE})`,
    )
  } else {
    const allOpenTasks = await queryOpenTasks('ascending')
    const todayOpenTasks = allOpenTasks.filter((task) =>
      isDueOnDate(task.dueDate, localDate, TIME_ZONE),
    )
    const tasksToNotify = mergeTaskSources(todayOpenTasks, allOpenTasks)

    if (tasksToNotify.length === 0) {
      await sendNtfyNotification(
        ntfyTopic,
        'All clear',
        `No open tasks found for ${localDate}.`,
      )
      console.log('Sent all-clear notification')
    } else {
      for (const task of tasksToNotify) {
        const dueDateText = task.dueDate
        const sourceText = task.isDueToday ? 'today+all' : 'all'
        const body = `Task: ${task.task}\nDue: ${dueDateText}\nSource: ${sourceText}`
        await sendNtfyNotification(ntfyTopic, 'Task still open', body)
      }

      console.log(
        `Sent ${String(tasksToNotify.length)} reminder notification(s) (${String(todayOpenTasks.length)} due today, ${String(allOpenTasks.length)} open total)`,
      )
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  })
  const hourPart = formatter
    .formatToParts(date)
    .find((part) => part.type === 'hour')

  if (hourPart === undefined || hourPart.value === '') {
    throw new Error(`Unable to determine hour for timezone ${timeZone}`)
  }

  const hour = Number.parseInt(hourPart.value, 10)
  if (Number.isNaN(hour)) {
    throw new Error(`Unable to parse hour value '${hourPart.value}'`)
  }

  return hour
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

function isDueOnDate(
  dueDateValue: string,
  expectedDate: string,
  timeZone: string,
): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateValue)) {
    return dueDateValue === expectedDate
  } else {
    const dueDate = new Date(dueDateValue)
    if (Number.isNaN(dueDate.getTime())) {
      throw new Error(`Invalid due date value '${dueDateValue}'`)
    } else {
      return formatDateInTimeZone(dueDate, timeZone) === expectedDate
    }
  }
}

function mergeTaskSources(
  todayOpenTasks: TaskItem[],
  allOpenTasks: TaskItem[],
): (TaskItem & { isDueToday: boolean })[] {
  const tasksById = new Map<string, TaskItem & { isDueToday: boolean }>()

  for (const task of allOpenTasks) {
    tasksById.set(task.id, {
      ...task,
      isDueToday: false,
    })
  }

  for (const task of todayOpenTasks) {
    const existingTask = tasksById.get(task.id)
    if (existingTask === undefined) {
      tasksById.set(task.id, {
        ...task,
        isDueToday: true,
      })
      continue
    }

    existingTask.isDueToday = true
  }

  return Array.from(tasksById.values())
}

async function sendNtfyNotification(topic: string, title: string, body: string) {
  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: {
      Title: title,
      Tags: 'warning',
    },
    body,
  })

  if (response.ok) {
    return undefined
  } else {
    const errorBody = await response.text()
    throw new Error(
      `ntfy request failed (${String(response.status)} ${response.statusText}): ${errorBody}`,
    )
  }
}

void main()
