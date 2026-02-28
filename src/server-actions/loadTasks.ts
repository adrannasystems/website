import { createServerFn } from "@tanstack/react-start";

export const loadTasks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { queryTasksForPage } = await import("../notion-tasks-for-page.server");
    const tasks = await queryTasksForPage();
    return { isError: false, data: tasks };
  } catch {
    return { isError: true };
  }
});
