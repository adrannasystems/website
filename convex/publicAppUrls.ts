import type { Id } from "./_generated/dataModel";

export function buildMaintenanceTaskDeepLink(
  publicAppOrigin: string,
  taskId: Id<"maintenanceTasks">,
): string {
  return new URL(`/tasks/${taskId}`, publicAppOrigin).toString();
}
