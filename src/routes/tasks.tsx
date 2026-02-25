import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import * as React from "react";
import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import { z } from "zod";
import type { LoaderResult } from "../loader-result";
import { getNotionConfig } from "../notion";
import { taskPropertyNames, mapTasks, type TaskItem } from "../notion-tasks";

const tasksQueryKey = ["tasks"] as const;

export const Route = createFileRoute("/tasks")({
  beforeLoad: ({ context }) => {
    if (context.currentUserId === null) {
      throw redirect({
        to: "/sign-in",
        search: { redirect_url: "/tasks" },
      });
    }
  },
  component: TasksPage,
});

function TasksPage() {
  const queryClient = useQueryClient();
  const [pendingTaskIds, setPendingTaskIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const taskQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: loadTasks,
  });

  const markTaskDoneMutation = useMutation({
    mutationFn: markTaskDone,
  });

  const handleMarkDone = React.useCallback(
    async (taskId: string) => {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

      const previousTaskResult = queryClient.getQueryData<LoaderResult<TaskItem[]>>(
        tasksQueryKey,
      );

      queryClient.setQueryData<LoaderResult<TaskItem[]>>(
        tasksQueryKey,
        (currentTaskResult) => {
          if (currentTaskResult === undefined || currentTaskResult.isError) {
            return currentTaskResult;
          }

          return {
            isError: false,
            data: currentTaskResult.data.map((task) => {
              if (task.id !== taskId) {
                return task;
              }

              return {
                ...task,
                done: true,
              };
            }),
          };
        },
      );

      try {
        const result = await markTaskDoneMutation.mutateAsync({ data: { taskId } });
        if (result.isError) {
          queryClient.setQueryData(tasksQueryKey, previousTaskResult);
          setToastMessage("Unable to mark this task as done.");
        }
      } catch {
        queryClient.setQueryData(tasksQueryKey, previousTaskResult);
        setToastMessage("Unable to mark this task as done.");
      } finally {
        await queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        setPendingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [markTaskDoneMutation, queryClient],
  );

  if (taskQuery.isPending) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </main>
    );
  }

  const taskResult = taskQuery.data;
  if (taskResult === undefined || taskResult.isError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Unable to load tasks.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
        <TasksContent
          tasks={taskResult.data}
          pendingTaskIds={pendingTaskIds}
          toastMessage={toastMessage}
          onDismissToast={() => {
            setToastMessage(null);
          }}
          onMarkDone={handleMarkDone}
        />
      </div>
    </main>
  );
}

function TasksContent(props: {
  tasks: TaskItem[];
  pendingTaskIds: Set<string>;
  toastMessage: string | null;
  onDismissToast: () => void;
  onMarkDone: (taskId: string) => Promise<void>;
}) {
  return (
    <div>
      {props.toastMessage !== null ? (
        <div className="fixed right-4 top-4 z-50 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow">
          <div className="flex items-center gap-3">
            <span>{props.toastMessage}</span>
            <button
              type="button"
              onClick={props.onDismissToast}
              className="font-medium text-amber-900 hover:text-amber-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="text-sm text-gray-500 mb-4">{props.tasks.length} items</div>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="divide-y divide-gray-200">
          {props.tasks.map((task) => {
            const isPending = props.pendingTaskIds.has(task.id);

            return (
              <div
                key={task.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <div className="text-lg font-medium text-gray-900">
                    {task.task}
                  </div>
                  {task.dueDate !== "" ? (
                    <div className="text-sm text-gray-500">Due: {task.dueDate}</div>
                  ) : null}
                </div>
                <div className="flex items-center">
                  <span
                    className={
                      task.done
                        ? "text-green-700 bg-green-50 border border-green-200"
                        : "text-gray-600 bg-gray-100 border border-gray-200"
                    }
                  >
                    <span className="text-sm font-medium px-3 py-1 rounded-full border inline-flex">
                      {task.done ? "Done" : "Open"}
                    </span>
                  </span>
                  {!task.done ? (
                    <button
                      type="button"
                      onClick={() => {
                        void props.onMarkDone(task.id);
                      }}
                      disabled={isPending}
                      className="ml-3 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending ? "Marking..." : "Mark done"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {props.tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No tasks found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const loadTasks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { client, databaseId } = getNotionConfig();
    const response: QueryDataSourceResponse = await client.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: taskPropertyNames.done,
        checkbox: { equals: false },
      },
      sorts: [{ property: taskPropertyNames.dueDate, direction: "descending" }],
    });

    const mappedTasks = mapTasks(response.results);
    if (mappedTasks.isErr()) {
      return { isError: true };
    }

    return { isError: false, data: mappedTasks.value };
  } catch {
    return { isError: true };
  }
});

const markTaskDoneInput = z.object({
  taskId: z.string().trim().min(1),
});

const markTaskDone = createServerFn({ method: "POST" })
  .inputValidator(markTaskDoneInput)
  .handler(async ({ data }) => {
    const taskId = data.taskId;

    const authState = await auth();
    if (authState.userId === null) {
      return { isError: true };
    }

    try {
      const { client } = getNotionConfig();
      await client.pages.update({
        page_id: taskId,
        properties: {
          [taskPropertyNames.done]: {
            checkbox: true,
          },
        },
      });

      return { isError: false };
    } catch {
      return { isError: true };
    }
  });
