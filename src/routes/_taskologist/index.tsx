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
import { useLocale } from "@/locale";
import { m } from "@/paraglide/messages.js";

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
  const { locale } = useLocale();

  return (
    <div className="flex flex-col" lang={locale}>
      {/* Hero */}
      <section className="bg-linear-to-br from-blue-50 to-indigo-50 px-6 pt-12 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">{m.landingHeroTitle()}</h1>
          <p className="mb-10 text-xl text-gray-600">{m.landingHeroSubtitle()}</p>
          <Link to="/sign-in">
            <Button size="lg" className="px-8 py-3 text-base">
              {m.landingHeroCta()}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <Clock className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{m.landingFeature1Title()}</h3>
            <p className="text-sm text-gray-600">{m.landingFeature1Body()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <CheckCircle2 className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{m.landingFeature2Title()}</h3>
            <p className="text-sm text-gray-600">{m.landingFeature2Body()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
            <Bell className="mb-4 h-8 w-8 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{m.landingFeature3Title()}</h3>
            <p className="text-sm text-gray-600">{m.landingFeature3Body()}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaintenanceTasksContent() {
  const { locale } = useLocale();
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
        setCreateErrorMessage(m.errorTaskNameRequired());
      } else if (!Number.isFinite(periodHoursNumber) || periodHoursNumber <= 0) {
        setCreateErrorMessage(m.errorPeriodHours());
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
          setCreateErrorMessage(m.errorCreateTask());
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
      setPushPreferenceError(m.errorUpdateNotification());
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
      <main className="min-h-screen bg-gray-50 px-6 py-20" lang={locale}>
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-gray-900">{m.maintenanceTasks()}</h1>
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
                {m.addTask()}
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
                <DialogTitle>{m.addTaskDialogTitle()}</DialogTitle>
                <DialogDescription>{m.addTaskDialogDescription()}</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={(e) => void handleCreateTask(e)}>
                <div className="grid gap-1.5">
                  <Label htmlFor="mtask-name">{m.taskName()}</Label>
                  <Input
                    id="mtask-name"
                    value={createName}
                    onChange={(event) => {
                      setCreateName(event.target.value);
                    }}
                    placeholder={m.taskNamePlaceholder()}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="mtask-period-hours">{m.taskPeriodHours()}</Label>
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
                  <Label htmlFor="mtask-shared">{m.taskShared()}</Label>
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
                    {m.cancel()}
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? m.creating() : m.create()}
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
                    {m.noMaintenanceTasks()}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">{m.archivedTasks()}</h2>
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
                    {m.noArchivedTasks()}
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
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20" lang={locale}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-gray-900">{m.maintenanceTasks()}</h1>
          <div className="size-8 rounded-lg border border-gray-200 bg-white" aria-hidden />
        </div>
        <div className="text-sm text-gray-500">{m.loading()}</div>
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
    return m.pushUnavailable();
  } else if (isUpdatingPushPreference) {
    return m.pushUpdating();
  } else if (isPushOptedIn === null) {
    return m.pushLoading();
  } else if (isPushOptedIn) {
    return m.pushUnsubscribe();
  } else {
    return m.pushSubscribe();
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
  const { locale } = useLocale();
  const updateTask = useMutation(api.maintenanceTasks.updateTask);
  const archiveTask = useMutation(api.maintenanceTasks.archiveTask);
  const addExecution = useMutation(api.maintenanceTasks.addExecution);
  const deleteExecution = useMutation(api.maintenanceTasks.deleteExecution);
  const setNotificationsEnabled = useMutation(api.maintenanceTasks.setTaskNotificationsEnabled);

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
      props.onError(m.errorTaskNameRequired());
    } else if (!Number.isFinite(periodHoursNumber) || periodHoursNumber <= 0) {
      props.onError(m.errorPeriodHours());
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
        props.onError(m.errorUpdateTask());
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
      props.onError(m.errorArchiveTask());
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
      props.onError(m.errorAddExecution());
    } finally {
      setIsSavingExecutionNow(false);
    }
  }, [addExecution, props]);

  const handleAddExecutionCustom = React.useCallback(async () => {
    const selectedDate = new Date(executionDialogValue);

    if (Number.isNaN(selectedDate.getTime())) {
      props.onError(m.errorInvalidExecutionDate());
    } else {
      setIsSavingExecutionCustom(true);

      try {
        await addExecution({
          taskId: props.task.id,
          executedAt: selectedDate.getTime(),
        });
        setExecutionDialogOpen(false);
      } catch {
        props.onError(m.errorAddExecution());
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
        props.onError(m.errorDeleteExecution());
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
            aria-label={m.dragToReorder()}
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
                  <Label htmlFor={`edit-name-${props.task.id}`}>{m.taskName()}</Label>
                  <Input
                    id={`edit-name-${props.task.id}`}
                    value={editName}
                    onChange={(event) => {
                      setEditName(event.target.value);
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`edit-period-${props.task.id}`}>{m.taskPeriodHours()}</Label>
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
                  <Label htmlFor={`edit-shared-${props.task.id}`}>{m.taskShared()}</Label>
                </div>
              </div>
            ) : (
              <>
                <div className="text-lg font-medium text-gray-900">{props.task.name}</div>
                <div className="text-sm text-gray-500">
                  {m.periodHours({ hours: String(props.task.periodHours) })}
                </div>
                <div className="text-sm text-gray-500">
                  {props.task.lastExecutedAt === null
                    ? m.lastExecutionNever()
                    : m.lastExecution({ date: formatDateTime(props.task.lastExecutedAt, locale) })}
                </div>
                <div className="text-sm text-gray-500">
                  {m.periodsDue({ value: props.task.periodsDue.toFixed(2) })}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className={getStateClassName(props.task.state)}>
                    {getStateLabel(props.task.state)}
                  </span>
                  {props.task.shared ? (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                      {m.sharedBadge()}
                    </span>
                  ) : null}
                  {props.task.actions.toggleNotifications === "hidden" &&
                  !props.task.notificationsEnabled ? (
                    <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-500">
                      <BellOff className="h-3 w-3" />
                      {m.notificationsOff()}
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
                  {isSavingEdit ? m.saving() : m.save()}
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
                  {m.cancel()}
                </Button>
              </>
            ) : (
              <>
                {props.task.actions.toggleNotifications !== "hidden" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={props.task.actions.toggleNotifications === "restricted"}
                    aria-label={
                      props.task.notificationsEnabled
                        ? m.disableNotifications()
                        : m.enableNotifications()
                    }
                    title={
                      props.task.notificationsEnabled
                        ? m.disableNotifications()
                        : m.enableNotifications()
                    }
                    onClick={() =>
                      void setNotificationsEnabled({
                        taskId: props.task.id,
                        enabled: !props.task.notificationsEnabled,
                      })
                    }
                  >
                    {props.task.notificationsEnabled ? (
                      <Bell className="h-4 w-4 text-blue-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  aria-label={m.editTask()}
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
                  {isSavingExecutionNow ? m.saving() : m.addExecutionNow()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setExecutionDialogValue(getNowDateTimeLocalValue());
                    setExecutionDialogOpen(true);
                  }}
                >
                  {m.addExecutionCustom()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExecutions((currentValue) => !currentValue);
                  }}
                >
                  {showExecutions ? m.hideExecutions() : m.showExecutions()}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  aria-label={m.archiveTask()}
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
            <div className="text-sm text-gray-500">{m.loadingExecutions()}</div>
          ) : executions.length === 0 ? (
            <div className="text-sm text-gray-500">{m.noExecutions()}</div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => {
                return (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between rounded bg-white px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      {formatDateTime(execution.executedAt, locale)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void handleDeleteExecution(execution.id);
                      }}
                    >
                      {m.remove()}
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
            <DialogTitle>{m.addExecutionDialogTitle()}</DialogTitle>
            <DialogDescription>{m.addExecutionDialogDescription()}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`execution-custom-${props.task.id}`}>{m.executedAt()}</Label>
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
              {m.cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleAddExecutionCustom();
              }}
              disabled={isSavingExecutionCustom}
            >
              {isSavingExecutionCustom ? m.saving() : m.save()}
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
  const { locale } = useLocale();
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
      props.onError(m.errorUnarchiveTask());
    } finally {
      setIsUnarchivingTask(false);
    }
  }, [props, unarchiveTask]);

  const handleDeleteTaskPermanently = React.useCallback(async () => {
    setIsPermanentlyDeletingTask(true);

    try {
      await deleteArchivedTaskPermanently({ taskId: props.task.id });
    } catch {
      props.onError(m.errorDeleteTask());
    } finally {
      setIsPermanentlyDeletingTask(false);
    }
  }, [deleteArchivedTaskPermanently, props]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-lg font-medium text-gray-900">{props.task.name}</div>
        <div className="text-sm text-gray-500">
          {m.periodHours({ hours: String(props.task.periodHours) })}
        </div>
        <div className="text-sm text-gray-500">
          {props.task.lastExecutedAt === null
            ? m.lastExecutionNever()
            : m.lastExecution({ date: formatDateTime(props.task.lastExecutedAt, locale) })}
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
            {isUnarchivingTask ? m.unarchiving() : m.unarchive()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDeleteTaskPermanently()}
            disabled={isUnarchivingTask || isPermanentlyDeletingTask}
          >
            {isPermanentlyDeletingTask ? m.deleting() : m.deletePermanently()}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getStateLabel(state: string): string {
  if (state === "All Good") {
    return m.stateAllGood();
  } else if (state === "Due") {
    return m.stateDue();
  } else if (state === "Overdue") {
    return m.stateOverdue();
  } else if (state === "Never Done") {
    return m.stateNeverDone();
  } else {
    return state;
  }
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

function formatDateTime(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
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
