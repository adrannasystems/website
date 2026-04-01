import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { getOneSignal } from "@/components/OneSignalSync";
import { Button } from "@/components/ui/button";
import {
  Archive,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  GripVertical,
  Pencil,
  Plus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { cn } from "@/lib/utils";
import { z } from "zod";

type MaintenanceTask = FunctionReturnType<
  typeof api.maintenanceTasks.listTasksForMaintenanceOverview
>[number];

const taskologistIndexSearchSchema = z.object({
  task: z
    .string()
    .trim()
    .transform((v) => (v.length > 0 ? v : undefined))
    .optional(),
});

export const Route = createFileRoute("/_taskologist/")({
  validateSearch: taskologistIndexSearchSchema,
  component: IndexPage,
});

function IndexPage() {
  return (
    <>
      <AuthLoading>
        <MaintenanceTasksLoadingState />
      </AuthLoading>
      <Authenticated>
        <MaintenanceTasksContent />
      </Authenticated>
      <Unauthenticated>
        <TaskologistLandingPage />
      </Unauthenticated>
    </>
  );
}

function TaskologistLandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-linear-to-br from-blue-50 to-indigo-50 px-6 pt-12 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">Never Miss a Maintenance Task</h1>
          <p className="mb-10 text-xl text-gray-600">
            Track recurring maintenance work, stay on top of what's overdue, and keep a full history
            of every execution.
          </p>
          <Link to="/sign-in">
            <Button size="lg" className="px-8 py-3 text-base">
              Go to app
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <Clock className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Recurring Schedules</h3>
            <p className="text-sm text-gray-600">
              Define tasks with a period in hours. The app always knows what's due and how overdue
              it is.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <CheckCircle2 className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Execution History</h3>
            <p className="text-sm text-gray-600">
              Log each time a task is completed — with the exact timestamp — so you always have a
              clear audit trail.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <Bell className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Overdue Alerts</h3>
            <p className="text-sm text-gray-600">
              Tasks are clearly flagged as overdue, due, or all good — so nothing slips through the
              cracks.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaintenanceTasksContent() {
  const { task: highlightTaskIdFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;
  const [pulseTaskId, setPulseTaskId] = React.useState<string | null>(null);

  const createTask = useMutation(api.maintenanceTasks.createTask);
  const reorderTasks = useMutation(api.maintenanceTasks.reorderTasks);
  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createPeriodHours, setCreatePeriodHours] = React.useState("24");
  const [createShared, setCreateShared] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createErrorMessage, setCreateErrorMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPushOptedIn, setIsPushOptedIn] = React.useState<boolean | null>(null);
  const [isPushPreferenceAvailable, setIsPushPreferenceAvailable] = React.useState(true);
  const [isUpdatingPushPreference, setIsUpdatingPushPreference] = React.useState(false);
  const [pushPreferenceError, setPushPreferenceError] = React.useState<string | null>(null);
  const activeTasksResult = useQuery(api.maintenanceTasks.listTasksForMaintenanceOverview, {});
  const archivedTasksResult = useQuery(
    api.maintenanceTasks.listArchivedTasksForMaintenanceOverview,
    {},
  );
  const myPositionsResult = useQuery(api.maintenanceTasks.getMyTaskPositions, {});

  React.useLayoutEffect(() => {
    if (highlightTaskIdFromUrl === undefined) {
      return;
    }
    if (activeTasksResult === undefined) {
      return;
    }
    const found = activeTasksResult.some((t) => t.id === highlightTaskIdFromUrl);
    if (!found) {
      return;
    }

    setPulseTaskId(highlightTaskIdFromUrl);

    const rowId = `maintenance-task-${highlightTaskIdFromUrl}`;
    const scrollFrame = window.requestAnimationFrame(() => {
      document.getElementById(rowId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const finishHighlightTimer = window.setTimeout(() => {
      setPulseTaskId(null);
      void navigateRef.current({
        search: {},
        replace: true,
        resetScroll: false,
      });
    }, 2800);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(finishHighlightTimer);
    };
  }, [activeTasksResult, highlightTaskIdFromUrl]);

  const handleCreateTask = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const name = createName.trim();
      const periodHoursNumber = Number(createPeriodHours);

      if (name === "") {
        setCreateErrorMessage("Task name is required.");
      } else if (!Number.isFinite(periodHoursNumber) || periodHoursNumber <= 0) {
        setCreateErrorMessage("Period hours must be a number greater than 0.");
      } else {
        setIsCreating(true);
        setCreateErrorMessage(null);

        try {
          await createTask({
            name,
            periodHours: periodHoursNumber,
            shared: createShared,
          });
          setCreateName("");
          setCreatePeriodHours("24");
          setCreateShared(false);
          setIsAddTaskOpen(false);
        } catch {
          setCreateErrorMessage("Unable to create maintenance task.");
        } finally {
          setIsCreating(false);
        }
      }
    },
    [createName, createPeriodHours, createShared, createTask],
  );

  React.useEffect(() => {
    let isMounted = true;
    let removePushSubscriptionListener: (() => void) | undefined;

    void getOneSignal()
      .then((OneSignal) => {
        if (!isMounted) {
          return;
        }

        if (!OneSignal.Notifications.isPushSupported()) {
          setIsPushPreferenceAvailable(false);
          setIsPushOptedIn(false);
          setPushPreferenceError(null);
          return;
        }

        setIsPushPreferenceAvailable(true);
        setIsPushOptedIn(Boolean(OneSignal.User.PushSubscription.optedIn));

        const handlePushSubscriptionChange = () => {
          if (isMounted) {
            setIsPushOptedIn(Boolean(OneSignal.User.PushSubscription.optedIn));
          }
        };

        OneSignal.User.PushSubscription.addEventListener("change", handlePushSubscriptionChange);
        removePushSubscriptionListener = () => {
          OneSignal.User.PushSubscription.removeEventListener(
            "change",
            handlePushSubscriptionChange,
          );
        };
      })
      .catch(() => {
        if (isMounted) {
          setIsPushPreferenceAvailable(false);
          setIsPushOptedIn(false);
          setPushPreferenceError(null);
        }
      });

    return () => {
      isMounted = false;
      removePushSubscriptionListener?.();
    };
  }, []);

  const handleTogglePushSubscription = React.useCallback(async () => {
    if (!isPushPreferenceAvailable || isPushOptedIn === null || isUpdatingPushPreference) {
      return;
    }

    setIsUpdatingPushPreference(true);
    setPushPreferenceError(null);

    try {
      const OneSignal = await getOneSignal();

      if (isPushOptedIn) {
        await OneSignal.User.PushSubscription.optOut();
      } else {
        await OneSignal.User.PushSubscription.optIn();
      }

      setIsPushOptedIn(Boolean(OneSignal.User.PushSubscription.optedIn));
    } catch {
      setPushPreferenceError("Unable to update notification preference.");
    } finally {
      setIsUpdatingPushPreference(false);
    }
  }, [isPushOptedIn, isPushPreferenceAvailable, isUpdatingPushPreference]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Classify and sort tasks: unacknowledged (new/re-shared) at top, then by user-defined position.
  const displayedTasks = React.useMemo(() => {
    const tasks = activeTasksResult ?? [];
    const positions = myPositionsResult ?? [];
    const posMap = new Map(positions.map((p) => [p.taskId, p]));

    const unacknowledged: MaintenanceTask[] = [];
    const positioned: MaintenanceTask[] = [];

    for (const task of tasks) {
      const pos = posMap.get(task.id);
      const isUnacknowledged =
        pos === undefined ||
        (task.lastSharedAt !== undefined && task.lastSharedAt > (pos.lastPositionedAt ?? 0));
      if (isUnacknowledged) {
        unacknowledged.push(task);
      } else {
        positioned.push(task);
      }
    }

    // unacknowledged: already newest-first from backend; positioned: sort by stored position
    positioned.sort(
      (a, b) => (posMap.get(a.id)?.position ?? 0) - (posMap.get(b.id)?.position ?? 0),
    );

    return [...unacknowledged, ...positioned];
  }, [activeTasksResult, myPositionsResult]);

  // Optimistic local order for instant drag feedback.
  const [localOrder, setLocalOrder] = React.useState<Id<"maintenanceTasks">[]>([]);

  React.useEffect(() => {
    setLocalOrder(displayedTasks.map((t) => t.id));
  }, [displayedTasks]);

  const orderedTasks = React.useMemo(() => {
    const taskMap = new Map(displayedTasks.map((t) => [t.id, t]));
    return localOrder.flatMap((id) => {
      const task = taskMap.get(id);
      return task !== undefined ? [task] : [];
    });
  }, [displayedTasks, localOrder]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) {
      return;
    }
    setLocalOrder((prev) => {
      const activeId = prev.find((id) => id === active.id);
      const overId = prev.find((id) => id === over.id);
      if (activeId === undefined || overId === undefined) {
        return prev;
      }
      const newOrder = arrayMove(prev, prev.indexOf(activeId), prev.indexOf(overId));
      void reorderTasks({ orderedTaskIds: newOrder });
      return newOrder;
    });
  }

  if (activeTasksResult === undefined || archivedTasksResult === undefined) {
    return <MaintenanceTasksLoadingState />;
  } else {
    const archivedTasks = archivedTasksResult;

    return (
      <main className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-gray-900">Maintenance Tasks</h1>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCreateName("");
                  setCreatePeriodHours("24");
                  setCreateShared(false);
                  setCreateErrorMessage(null);
                  setIsAddTaskOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add task
              </Button>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void handleTogglePushSubscription()}
              disabled={
                !isPushPreferenceAvailable || isPushOptedIn === null || isUpdatingPushPreference
              }
              aria-label={getPushSubscriptionToggleLabel(
                isPushPreferenceAvailable,
                isPushOptedIn,
                isUpdatingPushPreference,
              )}
              title={getPushSubscriptionToggleLabel(
                isPushPreferenceAvailable,
                isPushOptedIn,
                isUpdatingPushPreference,
              )}
            >
              {!isPushPreferenceAvailable ? (
                <BellOff className="text-gray-300" />
              ) : isPushOptedIn === null ? (
                <Bell className="text-gray-400" />
              ) : isPushOptedIn ? (
                <Bell className="text-blue-600" />
              ) : (
                <BellOff className="text-gray-500" />
              )}
            </Button>
          </div>

          {pushPreferenceError === null || !isPushPreferenceAvailable ? null : (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {pushPreferenceError}
            </div>
          )}

          {errorMessage === null ? null : (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorMessage}
            </div>
          )}

          <Dialog
            open={isAddTaskOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddTaskOpen(false);
                setCreateErrorMessage(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add task</DialogTitle>
                <DialogDescription>Define a new recurring maintenance task.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={(e) => void handleCreateTask(e)}>
                <div className="grid gap-1.5">
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
                <div className="grid gap-1.5">
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
                <div className="flex items-center gap-2">
                  <input
                    id="mtask-shared"
                    type="checkbox"
                    checked={createShared}
                    onChange={(e) => {
                      setCreateShared(e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="mtask-shared">Shared</Label>
                </div>
                {createErrorMessage === null ? null : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {createErrorMessage}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddTaskOpen(false);
                      setCreateErrorMessage(null);
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <section className="mb-8">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-200">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {orderedTasks.map((task) => (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        onError={setErrorMessage}
                        isPulseHighlighted={pulseTaskId === task.id}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {orderedTasks.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No maintenance tasks yet.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">Archived tasks</h2>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-200">
                {archivedTasks.map((task) => {
                  return (
                    <ArchivedMaintenanceTaskRow
                      key={task.id}
                      task={task}
                      onError={setErrorMessage}
                    />
                  );
                })}
                {archivedTasks.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No archived maintenance tasks.
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
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-gray-900">Maintenance Tasks</h1>
          <div className="size-8 rounded-lg border border-gray-200 bg-white" aria-hidden />
        </div>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    </main>
  );
}

function getPushSubscriptionToggleLabel(
  isPushPreferenceAvailable: boolean,
  isPushOptedIn: boolean | null,
  isUpdatingPushPreference: boolean,
): string {
  if (!isPushPreferenceAvailable) {
    return "Push notifications are unavailable in this browser";
  } else if (isUpdatingPushPreference) {
    return "Updating notification preference";
  } else if (isPushOptedIn === null) {
    return "Loading notification preference";
  } else if (isPushOptedIn) {
    return "Unsubscribe from notifications";
  } else {
    return "Subscribe to notifications";
  }
}

function SortableTaskRow(props: {
  task: MaintenanceTask;
  onError: (message: string) => void;
  isPulseHighlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <MaintenanceTaskRow
        task={props.task}
        onError={props.onError}
        {...(props.isPulseHighlighted !== undefined
          ? { isPulseHighlighted: props.isPulseHighlighted }
          : {})}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function MaintenanceTaskRow(props: {
  task: MaintenanceTask;
  onError: (message: string) => void;
  isPulseHighlighted?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  const updateTask = useMutation(api.maintenanceTasks.updateTask);
  const archiveTask = useMutation(api.maintenanceTasks.archiveTask);
  const addExecution = useMutation(api.maintenanceTasks.addExecution);
  const deleteExecution = useMutation(api.maintenanceTasks.deleteExecution);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(props.task.name);
  const [editPeriodHours, setEditPeriodHours] = React.useState(String(props.task.periodHours));
  const [editShared, setEditShared] = React.useState(props.task.shared);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [showExecutions, setShowExecutions] = React.useState(false);
  const [isSavingExecutionNow, setIsSavingExecutionNow] = React.useState(false);
  const [isArchivingTask, setIsArchivingTask] = React.useState(false);

  const [executionDialogOpen, setExecutionDialogOpen] = React.useState(false);
  const [executionDialogValue, setExecutionDialogValue] = React.useState(
    getNowDateTimeLocalValue(),
  );
  const [isSavingExecutionCustom, setIsSavingExecutionCustom] = React.useState(false);

  React.useEffect(() => {
    setEditName(props.task.name);
    setEditPeriodHours(String(props.task.periodHours));
    setEditShared(props.task.shared);
  }, [props.task.name, props.task.periodHours, props.task.shared]);

  const executionQueryArgs = showExecutions ? { taskId: props.task.id } : "skip";
  const executionsResult = useQuery(api.maintenanceTasks.findTaskExecutions, executionQueryArgs);

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
          shared: editShared,
        });
        setIsEditing(false);
      } catch {
        props.onError("Unable to update maintenance task.");
      } finally {
        setIsSavingEdit(false);
      }
    }
  }, [editName, editPeriodHours, editShared, props, updateTask]);

  const handleArchiveTask = React.useCallback(async () => {
    setIsArchivingTask(true);

    try {
      await archiveTask({ taskId: props.task.id });
    } catch {
      props.onError("Unable to archive maintenance task.");
    } finally {
      setIsArchivingTask(false);
    }
  }, [archiveTask, props]);

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

  const executions = executionsResult ?? [];

  return (
    <div
      id={`maintenance-task-${props.task.id}`}
      className={cn(
        "px-6 py-4",
        props.isPulseHighlighted === true
          ? "scroll-mt-24 rounded-md border-l-4 border-sky-600 bg-sky-100 shadow-[inset_0_0_0_2px_rgba(2,132,199,0.35)] transition-colors duration-300"
          : undefined,
      )}
    >
      <div className="flex gap-1">
        {props.dragHandleProps !== undefined ? (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="mt-0.5 cursor-grab touch-none self-start rounded p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            {...props.dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {isEditing ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`edit-name-${props.task.id}`}>Name</Label>
                  <Input
                    id={`edit-name-${props.task.id}`}
                    value={editName}
                    onChange={(event) => {
                      setEditName(event.target.value);
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`edit-period-${props.task.id}`}>Period (hours)</Label>
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
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id={`edit-shared-${props.task.id}`}
                    type="checkbox"
                    checked={editShared}
                    onChange={(e) => {
                      setEditShared(e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`edit-shared-${props.task.id}`}>Shared</Label>
                </div>
              </div>
            ) : (
              <>
                <div className="text-lg font-medium text-gray-900">{props.task.name}</div>
                <div className="text-sm text-gray-500">Period: {props.task.periodHours} hours</div>
                <div className="text-sm text-gray-500">
                  Last execution:{" "}
                  {props.task.lastExecutedAt === null
                    ? "Never"
                    : formatDateTime(props.task.lastExecutedAt)}
                </div>
                <div className="text-sm text-gray-500">
                  Periods due: {props.task.periodsDue.toFixed(2)}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className={getStateClassName(props.task.state)}>{props.task.state}</span>
                  {props.task.shared ? (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                      Shared
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button type="button" onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(props.task.name);
                    setEditPeriodHours(String(props.task.periodHours));
                    setEditShared(props.task.shared);
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
                  aria-label="Edit task"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
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
                  aria-label="Archive task"
                  onClick={() => void handleArchiveTask()}
                  disabled={isArchivingTask}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
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
            <DialogDescription>Choose when this maintenance task was executed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`execution-custom-${props.task.id}`}>Executed at</Label>
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

function ArchivedMaintenanceTaskRow(props: {
  task: MaintenanceTask;
  onError: (message: string) => void;
}) {
  const unarchiveTask = useMutation(api.maintenanceTasks.unarchiveTask);
  const deleteArchivedTaskPermanently = useMutation(
    api.maintenanceTasks.deleteArchivedTaskPermanently,
  );
  const [isUnarchivingTask, setIsUnarchivingTask] = React.useState(false);
  const [isPermanentlyDeletingTask, setIsPermanentlyDeletingTask] = React.useState(false);

  const handleUnarchiveTask = React.useCallback(async () => {
    setIsUnarchivingTask(true);

    try {
      await unarchiveTask({ taskId: props.task.id });
    } catch {
      props.onError("Unable to unarchive maintenance task.");
    } finally {
      setIsUnarchivingTask(false);
    }
  }, [props, unarchiveTask]);

  const handleDeleteTaskPermanently = React.useCallback(async () => {
    setIsPermanentlyDeletingTask(true);

    try {
      await deleteArchivedTaskPermanently({ taskId: props.task.id });
    } catch {
      props.onError("Unable to permanently delete archived task.");
    } finally {
      setIsPermanentlyDeletingTask(false);
    }
  }, [deleteArchivedTaskPermanently, props]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-lg font-medium text-gray-900">{props.task.name}</div>
        <div className="text-sm text-gray-500">Period: {props.task.periodHours} hours</div>
        <div className="text-sm text-gray-500">
          Last execution:{" "}
          {props.task.lastExecutedAt === null ? "Never" : formatDateTime(props.task.lastExecutedAt)}
        </div>
      </div>
      <div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleUnarchiveTask()}
            disabled={isUnarchivingTask || isPermanentlyDeletingTask}
          >
            {isUnarchivingTask ? "Unarchiving..." : "Unarchive"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDeleteTaskPermanently()}
            disabled={isUnarchivingTask || isPermanentlyDeletingTask}
          >
            {isPermanentlyDeletingTask ? "Deleting..." : "Delete Permanently"}
          </Button>
        </div>
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
