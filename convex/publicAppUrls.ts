import type { Id } from "./_generated/dataModel";
import { maintenanceTaskRoute } from "../domain/routes/maintenanceTask";

export function buildMaintenanceTaskDeepLink(
  publicAppOrigin: string,
  taskId: Id<"maintenanceTasks">,
): string {
  const url = new URL(publicAppOrigin);
  url.searchParams.set(maintenanceTaskRoute.taskSearchParam, taskId);
  return url.toString();
}
