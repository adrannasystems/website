import { getNotionClient } from './notion.server'
import { taskPropertyNames } from './notion-tasks.server'

export async function markTaskDone(
  taskPageId: string,
  done: boolean,
  doneAt?: string,
): Promise<void> {
  const client = getNotionClient()
  const doneAtValue = done ? doneAt ?? new Date().toISOString() : null

  await client.pages.update({
    page_id: taskPageId,
    properties: {
      [taskPropertyNames.done]: {
        checkbox: done,
      },
      [taskPropertyNames.doneAt]: {
        date: doneAtValue === null ? null : { start: doneAtValue },
      },
    },
  })
}
