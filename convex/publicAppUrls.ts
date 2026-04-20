import type { Id } from "./_generated/dataModel";

export function buildMaintenanceTaskDeepLink(
  publicAppOrigin: string,
  taskId: Id<"maintenanceTasks">,
): string {
  const url = new URL(publicAppOrigin);
  url.searchParams.set("task", taskId);
  return url.toString();
}
