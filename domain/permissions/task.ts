import type { PermissionExpr, ResourcePermissions, TaskResource } from "./types";

export type TaskAction = "view" | "execute" | "edit" | "archive" | "delete" | "setNotifications";

const ownerOnly: PermissionExpr<TaskResource> = {
  kind: "eq",
  left: { kind: "field", path: "ownerId" },
  right: { kind: "currentUser" },
};

const ownerOrShared: PermissionExpr<TaskResource> = {
  kind: "or",
  conditions: [
    ownerOnly,
    { kind: "isTrue", expr: { kind: "field", path: "isShared" } },
  ],
};

export const taskPermissions: ResourcePermissions<TaskResource, TaskAction> = {
  view: ownerOrShared,
  execute: ownerOrShared,
  edit: ownerOnly,
  archive: ownerOnly,
  delete: ownerOnly,
  setNotifications: ownerOnly,
};
