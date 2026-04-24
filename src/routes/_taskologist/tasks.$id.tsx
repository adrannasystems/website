import * as React from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Archive, Bell, BellOff, ChevronLeft, Pencil } from "lucide-react";
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
import { type Locale, useLocale } from "@/locale";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_taskologist/tasks/$id")({
  component: TasksIdPage,
});

function TasksIdPage() {
  const location = useLocation();

  return (
    <>
      <AuthLoading>
        <LoadingPage />
      </AuthLoading>
      <Authenticated>
        <TaskDetailContent />
      </Authenticated>
      <Unauthenticated>
        <RedirectToSignIn redirectUrl={location.href} />
      </Unauthenticated>
    </>
  );
}

function RedirectToSignIn(props: { redirectUrl: string }) {
  const navigate = Route.useNavigate();

  React.useEffect(() => {
    void navigate({ to: "/sign-in", search: { redirect_url: props.redirectUrl } });
  }, [navigate, props.redirectUrl]);

  return <LoadingPage />;
}

function TaskDetailContent() {
  const { locale } = useLocale();
  const { id } = Route.useParams();
  const taskId = id as Id<"maintenanceTasks">;

  const task = useQuery(api.maintenanceTasks.getTaskForDetail, { taskId });
  const executions = useQuery(api.maintenanceTasks.findTaskExecutions, { taskId });
  const updateTask = useMutation(api.maintenanceTasks.updateTask);
  const archiveTask = useMutation(api.maintenanceTasks.archiveTask);
  const addExecution = useMutation(api.maintenanceTasks.addExecution);
  const deleteExecution = useMutation(api.maintenanceTasks.deleteExecution);
  const setNotificationsEnabled = useMutation(api.maintenanceTasks.setTaskNotificationsEnabled);

  const navigate = Route.useNavigate();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editPeriodHours, setEditPeriodHours] = React.useState("");
  const [editShared, setEditShared] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isSavingExecutionNow, setIsSavingExecutionNow] = React.useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = React.useState(false);
  const [executionDialogValue, setExecutionDialogValue] = React.useState(() =>
    getNowDateTimeLocalValue(),
  );
  const [isSavingExecutionCustom, setIsSavingExecutionCustom] = React.useState(false);

  const handleSaveEdit = React.useCallback(async () => {
    const name = editName.trim();
    const periodHoursNumber = Number(editPeriodHours);
    if (name === "") {
      setErrorMessage(m.errorTaskNameRequired());
    } else if (!Number.isFinite(periodHoursNumber) || periodHoursNumber <= 0) {
      setErrorMessage(m.errorPeriodHours());
    } else {
      setIsSavingEdit(true);
      try {
        await updateTask({ taskId, name, periodHours: periodHoursNumber, shared: editShared });
        setIsEditing(false);
      } catch {
        setErrorMessage(m.errorUpdateTask());
      } finally {
        setIsSavingEdit(false);
      }
    }
  }, [editName, editPeriodHours, editShared, taskId, updateTask]);

  const handleArchive = React.useCallback(async () => {
    setIsArchiving(true);
    try {
      await archiveTask({ taskId });
      void navigate({ to: "/" });
    } catch {
      setErrorMessage(m.errorArchiveTask());
      setIsArchiving(false);
    }
  }, [archiveTask, navigate, taskId]);

  const handleAddExecutionNow = React.useCallback(async () => {
    setIsSavingExecutionNow(true);
    try {
      await addExecution({ taskId, executedAt: Date.now() });
    } catch {
      setErrorMessage(m.errorAddExecution());
    } finally {
      setIsSavingExecutionNow(false);
    }
  }, [addExecution, taskId]);

  const handleAddExecutionCustom = React.useCallback(async () => {
    const selectedDate = new Date(executionDialogValue);
    if (Number.isNaN(selectedDate.getTime())) {
      setErrorMessage(m.errorInvalidExecutionDate());
    } else {
      setIsSavingExecutionCustom(true);
      try {
        await addExecution({ taskId, executedAt: selectedDate.getTime() });
        setExecutionDialogOpen(false);
      } catch {
        setErrorMessage(m.errorAddExecution());
      } finally {
        setIsSavingExecutionCustom(false);
      }
    }
  }, [addExecution, executionDialogValue, taskId]);

  const handleDeleteExecution = React.useCallback(
    async (executionId: Id<"maintenanceExecutions">) => {
      try {
        await deleteExecution({ executionId });
      } catch {
        setErrorMessage(m.errorDeleteExecution());
      }
    },
    [deleteExecution],
  );

  if (task === undefined) {
    return <LoadingPage />;
  }

  if (task === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BackBar />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center text-sm text-gray-500">
          {m.taskNotFound()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" lang={locale}>
      <BackBar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        {errorMessage !== null && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        <h1 className="mb-2 text-2xl font-semibold text-gray-900">{task.name}</h1>
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={getStateClassName(task.state)}>{getStateLabel(task.state)}</span>
          {task.shared && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {m.sharedBadge()}
            </span>
          )}
          {task.actions.toggleNotifications === "hidden" && !task.notificationsEnabled && (
            <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-500">
              <BellOff className="h-3 w-3" />
              {m.notificationsOff()}
            </span>
          )}
        </div>

        <div className="mb-6 space-y-1 text-sm text-gray-600">
          <div>{m.periodHours({ hours: String(task.periodHours) })}</div>
          <div>
            {task.lastExecutedAt === null
              ? m.lastExecutionNever()
              : m.lastExecution({ date: formatDateTime(task.lastExecutedAt, locale) })}
          </div>
          <div>{m.periodsDue({ value: formatDecimal(task.periodsDue, locale) })}</div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {task.actions.toggleNotifications !== "hidden" && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={task.actions.toggleNotifications === "restricted"}
              aria-label={
                task.notificationsEnabled ? m.disableNotifications() : m.enableNotifications()
              }
              title={task.notificationsEnabled ? m.disableNotifications() : m.enableNotifications()}
              onClick={() =>
                void setNotificationsEnabled({ taskId, enabled: !task.notificationsEnabled })
              }
            >
              {task.notificationsEnabled ? (
                <Bell className="h-4 w-4 text-blue-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label={m.editTask()}
            onClick={() => {
              setEditName(task.name);
              setEditPeriodHours(String(task.periodHours));
              setEditShared(task.shared);
              setIsEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleAddExecutionNow()}
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
            variant="destructive"
            aria-label={m.archiveTask()}
            onClick={() => void handleArchive()}
            disabled={isArchiving}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-medium text-gray-900">{m.executions()}</h2>
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {executions === undefined ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                {m.loadingExecutions()}
              </div>
            ) : executions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">{m.noExecutions()}</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {executions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm text-gray-700">
                      {formatDateTime(execution.executedAt, locale)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeleteExecution(execution.id)}
                    >
                      {m.remove()}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Dialog
          open={isEditing}
          onOpenChange={(open) => {
            if (!open) setIsEditing(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{m.editTask()}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">{m.taskName()}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-period">{m.taskPeriodHours()}</Label>
                <Input
                  id="edit-period"
                  type="number"
                  min="1"
                  step="1"
                  value={editPeriodHours}
                  onChange={(e) => setEditPeriodHours(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="edit-shared"
                  type="checkbox"
                  checked={editShared}
                  onChange={(e) => setEditShared(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-shared">{m.taskShared()}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                {m.cancel()}
              </Button>
              <Button type="button" onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
                {isSavingEdit ? m.saving() : m.save()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={executionDialogOpen} onOpenChange={setExecutionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{m.addExecutionDialogTitle()}</DialogTitle>
              <DialogDescription>{m.addExecutionDialogDescription()}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="execution-custom">{m.executedAt()}</Label>
              <Input
                id="execution-custom"
                type="datetime-local"
                value={executionDialogValue}
                onChange={(e) => setExecutionDialogValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExecutionDialogOpen(false)}
                disabled={isSavingExecutionCustom}
              >
                {m.cancel()}
              </Button>
              <Button
                type="button"
                onClick={() => void handleAddExecutionCustom()}
                disabled={isSavingExecutionCustom}
              >
                {isSavingExecutionCustom ? m.saving() : m.save()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function BackBar() {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-2xl px-6 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          {m.allTasks()}
        </Link>
      </div>
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BackBar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="text-center text-sm text-gray-500">{m.loading()}</div>
      </main>
    </div>
  );
}

function getStateLabel(state: string): string {
  if (state === "All Good") return m.stateAllGood();
  if (state === "Due") return m.stateDue();
  if (state === "Overdue") return m.stateOverdue();
  if (state === "Never Done") return m.stateNeverDone();
  return state;
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

function formatDecimal(value: number | bigint, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "decimal" }).format(value);
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
