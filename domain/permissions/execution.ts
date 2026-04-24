import type { ExecutionResource, PermissionExpr, ResourcePermissions } from "./types";

export type ExecutionAction = "view" | "delete";

const ownerOnly: PermissionExpr<ExecutionResource> = {
  kind: "eq",
  left: { kind: "field", path: "taskOwnerId" },
  right: { kind: "currentUser" },
};

export const executionPermissions: ResourcePermissions<ExecutionResource, ExecutionAction> = {
  // Visible to the task owner and to any authenticated user when the task is shared.
  view: {
    kind: "or",
    conditions: [ownerOnly, { kind: "isTrue", expr: { kind: "field", path: "isTaskShared" } }],
  },
  delete: ownerOnly,
};
