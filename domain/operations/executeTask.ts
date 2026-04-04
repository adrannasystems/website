import { ok, err, type Result } from "neverthrow";
import type { MaintenanceTaskModel, MsSinceEpoch, UserId } from "../models/MaintenanceTask";

type ExecuteError = "not_found" | "unauthorized" | "archived";

export function executeTask(
  task: MaintenanceTaskModel,
  actorId: UserId,
  executedAt: MsSinceEpoch,
): Result<{ executedAt: MsSinceEpoch; updateLastExecutedAt: boolean }, ExecuteError> {
  if (task.isArchived) {
    return err("archived");
  } else if (task.userId !== actorId && !task.isShared) {
    return err("unauthorized");
  } else {
    const updateLastExecutedAt =
      task.lastExecutedAt === null || executedAt > task.lastExecutedAt;
    return ok({ executedAt, updateLastExecutedAt });
  }
}
