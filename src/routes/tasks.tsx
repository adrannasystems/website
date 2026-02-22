import { Await, createFileRoute } from '@tanstack/react-router'
import type { QueryDataSourceResponse } from '@notionhq/client/build/src/api-endpoints'
import type { LoaderResult } from '../loader-result'
import { getNotionConfig } from '../notion'
import {
  getTaskPropertyNames,
  mapTasks,
  type TaskItem,
} from '../notion-tasks'

export const Route = createFileRoute('/tasks')({
  loader: loadTasksDeferred,
  component: TasksPage,
})

function TasksPage() {
  const { taskResultPromise } = Route.useLoaderData()

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
        <Await
          promise={taskResultPromise}
          fallback={<div className="text-sm text-gray-500">Loading...</div>}
        >
          {(taskResult) => <TasksContent taskResult={taskResult} />}
        </Await>
      </div>
    </main>
  )
}

function loadTasksDeferred() {
  return {
    taskResultPromise: loadTasks(),
  }
}

function TasksContent(props: { taskResult: LoaderResult<TaskItem[]> }) {
  if (props.taskResult.isError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Unable to load tasks.
      </div>
    )
  }

  const tasks = props.taskResult.data

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">{tasks.length} items</div>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-lg font-medium text-gray-900">
                  {task.task}
                </div>
                {task.dueDate !== '' ? (
                  <div className="text-sm text-gray-500">Due: {task.dueDate}</div>
                ) : null}
              </div>
              <span className={getStatusClassName(task.done)}>
                <span className="text-sm font-medium px-3 py-1 rounded-full border inline-flex">
                  {task.done ? 'Done' : 'Open'}
                </span>
              </span>
            </div>
          ))}
          {tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No tasks found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

async function loadTasks(): Promise<LoaderResult<TaskItem[]>> {
  try {
    const { client, databaseId } = getNotionConfig()
    const propertyNames = getTaskPropertyNames()
    const response: QueryDataSourceResponse = await client.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: propertyNames.done,
        checkbox: {
          equals: false,
        },
      },
      sorts: [
        {
          property: propertyNames.dueDate,
          direction: 'descending',
        },
      ],
    })

    const mappedTasks = mapTasks(response.results)
    if (mappedTasks.isErr()) {
      return { isError: true }
    }

    return { isError: false, data: mappedTasks.value }
  } catch {
    return { isError: true }
  }
}

function getStatusClassName(isDone: boolean): string {
  return isDone
    ? 'text-green-700 bg-green-50 border border-green-200'
    : 'text-gray-600 bg-gray-100 border border-gray-200'
}
