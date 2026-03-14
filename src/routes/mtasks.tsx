import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Bell } from "lucide-react";
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

type MaintenanceTask = {
  id: Id<"maintenanceTasks">;
  name: string;
  periodHours: number;
  state: string;
  periodsDue: number | null;
  lastExecutedAt: number | null;
};

type MaintenanceExecution = {
  id: Id<"maintenanceExecutions">;
  executedAt: number;
};

export const Route = createFileRoute("/mtasks")({
  component: MaintenanceTasksPage,
});

function MaintenanceTasksPage() {
  return (
    <>
      <AuthLoading>
        <MaintenanceTasksLoadingState />
      </AuthLoading>
      <Authenticated>
        <MaintenanceTasksContent />
      </Authenticated>
      <Unauthenticated>
        <MTasksLandingPage />
      </Unauthenticated>
    </>
  );
}

function MaintenanceTasksContent() {
  const createTask = useMutation(api.maintenanceTasks.createTask);
  const [createName, setCreateName] = React.useState("");
  const [createPeriodHours, setCreatePeriodHours] = React.useState("24");
  const [isCreating, setIsCreating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const activeTasksResult = useQuery(
    api.maintenanceTasks.listTasksForMaintenanceOverview,
    {},
  );
  const deletedTasksResult = useQuery(
    api.maintenanceTasks.listDeletedTasksForMaintenanceOverview,
    {},
  );

  const handleCreateTask = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const name = createName.trim();
      const periodHoursNumber = Number(createPeriodHours);

      if (name === "") {
        setErrorMessage("Task name is required.");
      } else if (
        !Number.isFinite(periodHoursNumber) ||
        periodHoursNumber <= 0
      ) {
        setErrorMessage("Period hours must be a number greater than 0.");
      } else {
        setIsCreating(true);
        setErrorMessage(null);

        try {
          await createTask({
            name,
            periodHours: periodHoursNumber,
          });
          setCreateName("");
          setCreatePeriodHours("24");
        } catch {
          setErrorMessage("Unable to create maintenance task.");
        } finally {
          setIsCreating(false);
        }
      }
    },
    [createName, createPeriodHours, createTask],
  );

  if (activeTasksResult === undefined || deletedTasksResult === undefined) {
    return <MaintenanceTasksLoadingState />;
  } else {
    const activeTasks = activeTasksResult as MaintenanceTask[];
    const deletedTasks = deletedTasksResult as MaintenanceTask[];

    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-semibold text-gray-900">
            Maintenance Tasks
          </h1>

          <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              Create task
            </h2>
            <form
              className="grid gap-4 md:grid-cols-3"
              onSubmit={handleCreateTask}
            >
              <div className="md:col-span-2">
                <Label htmlFor="mtask-name">Name</Label>
                <Input
                  id="mtask-name"
                  value={createName}
                  onChange={(event) => {
                    setCreateName(event.target.value);
                  }}
                  placeholder="e.g. Check backups"
                />
              </div>
              <div>
                <Label htmlFor="mtask-period-hours">Period (hours)</Label>
                <Input
                  id="mtask-period-hours"
                  type="number"
                  min="1"
                  step="1"
                  value={createPeriodHours}
                  onChange={(event) => {
                    setCreatePeriodHours(event.target.value);
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </section>

          {errorMessage === null ? null : (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorMessage}
            </div>
          )}

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              Active tasks
            </h2>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-200">
                {activeTasks.map((task) => {
                  return (
                    <MaintenanceTaskRow
                      key={task.id}
                      task={task}
                      onError={setErrorMessage}
                    />
                  );
                })}
                {activeTasks.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No maintenance tasks yet.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              Deleted tasks
            </h2>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-200">
                {deletedTasks.map((task) => {
                  return (
                    <DeletedMaintenanceTaskRow
                      key={task.id}
                      task={task}
                      onError={setErrorMessage}
                    />
                  );
                })}
                {deletedTasks.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No deleted maintenance tasks.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }
}

function MaintenanceTasksLoadingState() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-semibold text-gray-900">
          Maintenance Tasks
        </h1>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    </main>
  );
}

function MTasksLandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-linear-to-br from-blue-50 to-indigo-50 pt-24 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Never Miss a Maintenance Task
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            Track recurring maintenance work, stay on top of what's overdue,
            and keep a full history of every execution.
          </p>
          <Link to="/sign-in" search={{ redirect_url: "/mtasks" }}>
            <Button size="lg" className="px-8 py-3 text-base">
              Go to app
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-4xl grid md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
            <Clock className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recurring Schedules
            </h3>
            <p className="text-gray-600 text-sm">
              Define tasks with a period in hours. The app always knows what's
              due and how overdue it is.
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
            <CheckCircle2 className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Execution History
            </h3>
            <p className="text-gray-600 text-sm">
              Log each time a task is completed — with the exact timestamp —
              so you always have a clear audit trail.
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
            <Bell className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Overdue Alerts
            </h3>
            <p className="text-gray-600 text-sm">
              Tasks are clearly flagged as overdue, due, or all good — so
              nothing slips through the cracks.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaintenanceTaskRow(props: {
  task: MaintenanceTask;
  onError: (message: string) => void;
}) {
  const updateTask = useMutation(api.maintenanceTasks.updateTask);
  const deleteTask = useMutation(api.maintenanceTasks.deleteTask);
  const addExecution = useMutation(api.maintenanceTasks.addExecution);
  const deleteExecution = useMutation(api.maintenanceTasks.deleteExecution);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(props.task.name);
  const [editPeriodHours, setEditPeriodHours] = React.useState(
    String(props.task.periodHours),
  );
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [showExecutions, setShowExecutions] = React.useState(false);
  const [isSavingExecutionNow, setIsSavingExecutionNow] = React.useState(false);
  const [isDeletingTask, setIsDeletingTask] = React.useState(false);

  const [executionDialogOpen, setExecutionDialogOpen] = React.useState(false);
  const [executionDialogValue, setExecutionDialogValue] = React.useState(
    getNowDateTimeLocalValue(),
  );
  const [isSavingExecutionCustom, setIsSavingExecutionCustom] =
    React.useState(false);

  React.useEffect(() => {
    setEditName(props.task.name);
    setEditPeriodHours(String(props.task.periodHours));
  }, [props.task.name, props.task.periodHours]);

  const executionQueryArgs = showExecutions
    ? { taskId: props.task.id }
    : "skip";
  const executionsResult = useQuery(
    api.maintenanceTasks.findTaskExecutions,
    executionQueryArgs,
  );

  const handleSaveEdit = React.useCallback(async () => {
    const name = editName.trim();
    const periodHoursNumber = Number(editPeriodHours);

    if (name === "") {
      props.onError("Task name is required.");
    } else if (!Number.isFinite(periodHoursNumber) || periodHoursNumber <= 0) {
      props.onError("Period hours must be a number greater than 0.");
    } else {
      setIsSavingEdit(true);

      try {
        await updateTask({
          taskId: props.task.id,
          name,
          periodHours: periodHoursNumber,
        });
        setIsEditing(false);
      } catch {
        props.onError("Unable to update maintenance task.");
      } finally {
        setIsSavingEdit(false);
      }
    }
  }, [editName, editPeriodHours, props, updateTask]);

  const handleDeleteTask = React.useCallback(async () => {
    setIsDeletingTask(true);

    try {
      await deleteTask({ taskId: props.task.id });
    } catch {
      props.onError("Unable to delete maintenance task.");
    } finally {
      setIsDeletingTask(false);
    }
  }, [deleteTask, props]);

  const handleAddExecutionNow = React.useCallback(async () => {
    setIsSavingExecutionNow(true);

    try {
      await addExecution({
        taskId: props.task.id,
        executedAt: Date.now(),
      });
    } catch {
      props.onError("Unable to add execution.");
    } finally {
      setIsSavingExecutionNow(false);
    }
  }, [addExecution, props]);

  const handleAddExecutionCustom = React.useCallback(async () => {
    const selectedDate = new Date(executionDialogValue);

    if (Number.isNaN(selectedDate.getTime())) {
      props.onError("Please select a valid execution date and time.");
    } else {
      setIsSavingExecutionCustom(true);

      try {
        await addExecution({
          taskId: props.task.id,
          executedAt: selectedDate.getTime(),
        });
        setExecutionDialogOpen(false);
      } catch {
        props.onError("Unable to add execution.");
      } finally {
        setIsSavingExecutionCustom(false);
      }
    }
  }, [addExecution, executionDialogValue, props]);

  const handleDeleteExecution = React.useCallback(
    async (executionId: Id<"maintenanceExecutions">) => {
      try {
        await deleteExecution({ executionId });
      } catch {
        props.onError("Unable to delete execution.");
      }
    },
    [deleteExecution, props],
  );

  const executions = (executionsResult ?? []) as MaintenanceExecution[];

  return (
    <div className="px-6 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {isEditing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor={`edit-name-${props.task.id}`}>Name</Label>
                <Input
                  id={`edit-name-${props.task.id}`}
                  value={editName}
                  onChange={(event) => {
                    setEditName(event.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor={`edit-period-${props.task.id}`}>
                  Period (hours)
                </Label>
                <Input
                  id={`edit-period-${props.task.id}`}
                  type="number"
                  min="1"
                  step="1"
                  value={editPeriodHours}
                  onChange={(event) => {
                    setEditPeriodHours(event.target.value);
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-lg font-medium text-gray-900">
                {props.task.name}
              </div>
              <div className="text-sm text-gray-500">
                Period: {props.task.periodHours} hours
              </div>
              <div className="text-sm text-gray-500">
                Last execution:{" "}
                {props.task.lastExecutedAt === null
                  ? "Never"
                  : formatDateTime(props.task.lastExecutedAt)}
              </div>
              <div className="text-sm text-gray-500">
                Periods due:{" "}
                {props.task.periodsDue === null
                  ? "N/A"
                  : props.task.periodsDue.toFixed(2)}
              </div>
              <div className="mt-1">
                <span className={getStateClassName(props.task.state)}>
                  {props.task.state}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(props.task.name);
                  setEditPeriodHours(String(props.task.periodHours));
                }}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleAddExecutionNow();
                }}
                disabled={isSavingExecutionNow}
              >
                {isSavingExecutionNow ? "Saving..." : "Add Execution Now"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExecutionDialogValue(getNowDateTimeLocalValue());
                  setExecutionDialogOpen(true);
                }}
              >
                Add Execution Custom
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowExecutions((currentValue) => !currentValue);
                }}
              >
                {showExecutions ? "Hide Executions" : "Show Executions"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteTask()}
                disabled={isDeletingTask}
              >
                {isDeletingTask ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}
        </div>
      </div>

      {showExecutions ? (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          {executionsResult === undefined ? (
            <div className="text-sm text-gray-500">Loading executions...</div>
          ) : executions.length === 0 ? (
            <div className="text-sm text-gray-500">No executions yet.</div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => {
                return (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between rounded bg-white px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      {formatDateTime(execution.executedAt)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void handleDeleteExecution(execution.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <Dialog
        open={executionDialogOpen}
        onOpenChange={(open) => {
          setExecutionDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add execution date and time</DialogTitle>
            <DialogDescription>
              Choose when this maintenance task was executed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`execution-custom-${props.task.id}`}>
              Executed at
            </Label>
            <Input
              id={`execution-custom-${props.task.id}`}
              type="datetime-local"
              value={executionDialogValue}
              onChange={(event) => {
                setExecutionDialogValue(event.target.value);
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setExecutionDialogOpen(false);
              }}
              disabled={isSavingExecutionCustom}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleAddExecutionCustom();
              }}
              disabled={isSavingExecutionCustom}
            >
              {isSavingExecutionCustom ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeletedMaintenanceTaskRow(props: {
  task: MaintenanceTask;
  onError: (message: string) => void;
}) {
  const undeleteTask = useMutation(api.maintenanceTasks.undeleteTask);
  const [isUndeletingTask, setIsUndeletingTask] = React.useState(false);

  const handleUndeleteTask = React.useCallback(async () => {
    setIsUndeletingTask(true);

    try {
      await undeleteTask({ taskId: props.task.id });
    } catch {
      props.onError("Unable to restore maintenance task.");
    } finally {
      setIsUndeletingTask(false);
    }
  }, [props, undeleteTask]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-lg font-medium text-gray-900">{props.task.name}</div>
        <div className="text-sm text-gray-500">
          Period: {props.task.periodHours} hours
        </div>
        <div className="text-sm text-gray-500">
          Last execution:{" "}
          {props.task.lastExecutedAt === null
            ? "Never"
            : formatDateTime(props.task.lastExecutedAt)}
        </div>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleUndeleteTask()}
          disabled={isUndeletingTask}
        >
          {isUndeletingTask ? "Restoring..." : "Restore"}
        </Button>
      </div>
    </div>
  );
}

function getStateClassName(state: string): string {
  if (state === "Overdue") {
    return "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700";
  } else if (state === "Due") {
    return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700";
  } else if (state === "Never Done") {
    return "rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700";
  } else {
    return "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700";
  }
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString();
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
