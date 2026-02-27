import { getNotionClient } from './notion'
import { taskPropertyNames } from './notion-tasks'

export async function markTaskDone(taskPageId: string): Promise<void> {
  const client = getNotionClient()
  await client.pages.update({
    page_id: taskPageId,
    properties: {
      [taskPropertyNames.done]: {
        checkbox: true,
      },
    },
  })
}
