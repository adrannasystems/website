const path = "/" as const;

const buildSearch = (taskId: string): { readonly task: string } => ({ task: taskId });

type NavArgs = { readonly to: typeof path; readonly search: ReturnType<typeof buildSearch> };

export const maintenanceTaskRoute = {
  buildSearch,
  buildNavArgs: (taskId: string): NavArgs => ({
    to: path,
    search: buildSearch(taskId),
  }),
  buildUrl: (origin: string, taskId: string): string => {
    const url = new URL(origin);
    for (const [k, v] of Object.entries(buildSearch(taskId))) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  },
};
