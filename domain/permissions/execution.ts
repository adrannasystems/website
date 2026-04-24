import type { ExecutionResource, ResourcePermissions } from "./types";

export type ExecutionAction = "view" | "delete";

export const executionPermissions: ResourcePermissions<ExecutionResource, ExecutionAction> = {
  // Executions inherit access from their parent task; a user may view or delete
  // an execution only if they own the task it belongs to.
  // TODO: revisit view access once shared-task execution visibility is decided.
  view: {
    kind: "eq",
    left: { kind: "field", path: "taskOwnerId" },
    right: { kind: "currentUser" },
  },
  delete: {
    kind: "eq",
    left: { kind: "field", path: "taskOwnerId" },
    right: { kind: "currentUser" },
  },
};
