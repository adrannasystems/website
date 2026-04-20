import { err, ok, type Result } from "neverthrow";
import type { MaintenanceTaskModel, MsSinceEpoch, UserId } from "../models/MaintenanceTask";

export function archiveTask(
  task: MaintenanceTaskModel,
  actorId: UserId,
  archivedAt: MsSinceEpoch,
): Result<{ archivedAt: MsSinceEpoch }, "unauthorized"> {
  if (task.userId !== actorId && !task.isShared) {
    return err("unauthorized");
  } else {
    return ok({ archivedAt });
  }
}

export function unarchiveTask(
  task: MaintenanceTaskModel,
  actorId: UserId,
): Result<{ archivedAt: null }, "unauthorized"> {
  if (task.userId !== actorId && !task.isShared) {
    return err("unauthorized");
  } else {
    return ok({ archivedAt: null });
  }
}
