import type {
  PageObjectResponse,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { err, ok, Result } from 'neverthrow'

export type TaskItem = {
  id: string
  task: string
  done: boolean
  dueDate: string
}

export function mapTasks(
  results: QueryDataSourceResponse['results'],
): Result<TaskItem[], Error> {
  return Result.combine(
    results.map((result) => {
      if (!isPageObject(result)) {
        return err(new Error(`Unexpected Notion response: expected page object`))
      }

      return mapTask(result)
    }),
  ) 
}

export function getTaskPropertyNames() {
  return {
    task: 'Task',
    done: 'done',
    dueDate: 'due date',
  }
}

function mapTask(page: PageObjectResponse): Result<TaskItem, Error> {
  const properties = page.properties
  const names = getTaskPropertyNames()

  const taskProperty = properties[names.task]
  const doneProperty = properties[names.done]
  const dueDateProperty = properties[names.dueDate]

  if (taskProperty?.type !== 'select') {
    return err(new Error(
      `Invalid Notion property '${names.task}' on page '${page.id}': expected select`,
    ))
  }
  if (
    taskProperty.select?.name === undefined ||
    taskProperty.select.name === ''
  ) {
    return err(new Error(
      `Invalid Notion property '${names.task}' on page '${page.id}': missing selected value`,
    ))
  }

  if (doneProperty?.type !== 'checkbox') {
    return err(new Error(
      `Invalid Notion property '${names.done}' on page '${page.id}': expected checkbox`,
    ))
  }

  if (dueDateProperty?.type !== 'date') {
    return err(new Error(
      `Invalid Notion property '${names.dueDate}' on page '${page.id}': expected date`,
    ))
  }
  if (
    dueDateProperty.date?.start === undefined ||
    dueDateProperty.date.start === ''
  ) {
    return err(new Error(
      `Invalid Notion property '${names.dueDate}' on page '${page.id}': missing date`,
    ))
  }

  const task = taskProperty.select.name
  const done = doneProperty.checkbox
  const dueDate = dueDateProperty.date.start

  return ok({
    id: page.id,
    task,
    done,
    dueDate,
  })
}

function isPageObject(response: unknown): response is PageObjectResponse {
  return (
    typeof response === 'object' && response !== null && 'properties' in response
  )
}
