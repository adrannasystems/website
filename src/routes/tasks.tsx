import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { markTaskDone } from "../server-actions/mark-task-done";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoaderResult } from "../loader-result";
import type { TaskItem } from "../TaskItem";
import { loadTasks } from "../server-actions/loadTasks";

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
  const [doneAtPickerTaskId, setDoneAtPickerTaskId] = React.useState<string | null>(null);
  const [doneAtPickerValue, setDoneAtPickerValue] = React.useState<string>(
    getNowDateTimeLocalValue(),
  );

  const taskQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: loadTasks,
  });

  const markTaskDoneMutation = useMutation({
    mutationFn: markTaskDone,
  });

  const handleSetDone = React.useCallback(
    async (taskId: string, done: boolean, doneAt?: string) => {
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
          return currentTaskResult === undefined || currentTaskResult.isError
            ? currentTaskResult
              : {
                  isError: false,
                  data: currentTaskResult.data.map((task) => {
                    const doneAtValue = doneAt ?? new Date().toISOString();
                    return task.id === taskId
                      ? done
                          ? {
                              ...task,
                              done: true,
                              doneAt: doneAtValue,
                            }
                          : {
                              id: task.id,
                          task: task.task,
                          done: false,
                          dueDate: task.dueDate,
                        }
                    : task;
                }),
              };
        },
      );

      try {
        const mutationInput =
          doneAt === undefined ? { taskId, done } : { taskId, done, doneAt };
        const result = await markTaskDoneMutation.mutateAsync({ data: mutationInput });
        if (result.isError) {
          queryClient.setQueryData(tasksQueryKey, previousTaskResult);
          setToastMessage("Unable to update this task.");
        }
      } catch {
        queryClient.setQueryData(tasksQueryKey, previousTaskResult);
        setToastMessage("Unable to update this task.");
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

  const handleRequestSetDone = React.useCallback((taskId: string) => {
    setDoneAtPickerTaskId(taskId);
    setDoneAtPickerValue(getNowDateTimeLocalValue());
  }, []);

  const handleCloseDoneAtPicker = React.useCallback(() => {
    setDoneAtPickerTaskId(null);
  }, []);

  const handleConfirmSetDone = React.useCallback(async () => {
    if (doneAtPickerTaskId === null) {
      return;
    } else {
      const selectedDate = new Date(doneAtPickerValue);
      if (Number.isNaN(selectedDate.getTime())) {
        setToastMessage("Please select a valid date and time.");
      } else {
        await handleSetDone(doneAtPickerTaskId, true, selectedDate.toISOString());
        setDoneAtPickerTaskId(null);
      }
    }
  }, [doneAtPickerTaskId, doneAtPickerValue, handleSetDone]);

  const isSavingDoneAt =
    doneAtPickerTaskId === null ? false : pendingTaskIds.has(doneAtPickerTaskId);

  if (taskQuery.isPending) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </main>
    );
  } else if (taskQuery.data === undefined || taskQuery.data.isError) {
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
  } else {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Tasks</h1>
          <TasksContent
            tasks={taskQuery.data.data}
            pendingTaskIds={pendingTaskIds}
            toastMessage={toastMessage}
            onDismissToast={() => {
              setToastMessage(null);
            }}
            onSetUndone={async (taskId) => {
              await handleSetDone(taskId, false);
            }}
            onRequestSetDone={handleRequestSetDone}
          />
          <Dialog
            open={doneAtPickerTaskId !== null}
            onOpenChange={(nextOpen) => {
              if (nextOpen) {
                return;
              } else {
                handleCloseDoneAtPicker();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set done date and time</DialogTitle>
                <DialogDescription>
                  Choose when this task should be marked as done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="done-at">Done at</Label>
                <Input
                  id="done-at"
                  type="datetime-local"
                  value={doneAtPickerValue}
                  onChange={(event) => {
                    setDoneAtPickerValue(event.target.value);
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDoneAtPicker}
                  disabled={isSavingDoneAt}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => void handleConfirmSetDone()} disabled={isSavingDoneAt}>
                  {isSavingDoneAt ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    );
  }
}

function TasksContent(props: {
  tasks: TaskItem[];
  pendingTaskIds: Set<string>;
  toastMessage: string | null;
  onDismissToast: () => void;
  onSetUndone: (taskId: string) => Promise<void>;
  onRequestSetDone: (taskId: string) => void;
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
                  {task.doneAt !== undefined && task.doneAt !== "" ? (
                    <div className="text-sm text-gray-500">Done At: {task.doneAt}</div>
                  ) : null}
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (task.done) {
                        void props.onSetUndone(task.id);
                      } else {
                        props.onRequestSetDone(task.id);
                      }
                    }}
                    disabled={isPending}
                    className={
                      task.done
                        ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                        : "rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    }
                  >
                    {isPending ? "Saving..." : task.done ? "Done" : "Undone"}
                  </button>
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



function getNowDateTimeLocalValue(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
