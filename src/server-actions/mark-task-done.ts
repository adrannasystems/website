import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";

const markTaskDoneInput = z.object({
  taskId: z.string().trim().min(1),
  done: z.boolean(),
  doneAt: z.string().datetime({ offset: true }).optional(),
});

export const markTaskDone = createServerFn({ method: "POST" })
  .inputValidator(markTaskDoneInput)
  .handler(async ({ data }) => {
    const taskId = data.taskId;
    const done = data.done;
    const doneAt = data.doneAt;

    const authState = await auth();
    if (authState.userId === null) {
      return { isError: true };
    } else {
      try {
        const { markTaskDone: markTaskDoneInNotion } = await import("../notion-mark-task-done.server");
        await markTaskDoneInNotion(taskId, done, doneAt);
        return { isError: false };
      } catch {
        return { isError: true };
      }
    }
  });