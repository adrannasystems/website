export const taskSearchParam = "task" as const;

const path = "/" as const;

export const maintenanceTaskRoute = {
  buildNavArgs: (taskId: string): { to: typeof path; search: Record<typeof taskSearchParam, string> } => ({
    to: path,
    search: { [taskSearchParam]: taskId },
  }),
  buildUrl: (origin: string, taskId: string): string => {
    const url = new URL(origin);
    url.searchParams.set(taskSearchParam, taskId);
    return url.toString();
  },
};
