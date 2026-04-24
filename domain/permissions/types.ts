import type { UserId } from "../models/MaintenanceTask";

export type ScalarValue = string | number | boolean | null;

// A permission is an expression tree (not a plain function) so it can be both evaluated
// in-process and translated into a database query filter.

export type Resource = TaskResource | ExecutionResource;

export type TaskResource = {
  readonly ownerId: UserId;
  readonly isShared: boolean;
  readonly isArchived: boolean;
};

export type ExecutionResource = {
  readonly taskOwnerId: UserId;
  readonly isTaskShared: boolean;
};

export type ValueExpr<R extends Resource> =
  | { readonly kind: "field"; readonly path: keyof R }
  | { readonly kind: "literal"; readonly value: ScalarValue }
  | { readonly kind: "currentUser" };

export type PermissionExpr<R extends Resource> =
  | { readonly kind: "always" }
  | { readonly kind: "never" }
  | { readonly kind: "eq"; readonly left: ValueExpr<R>; readonly right: ValueExpr<R> }
  | { readonly kind: "neq"; readonly left: ValueExpr<R>; readonly right: ValueExpr<R> }
  | { readonly kind: "isTrue"; readonly expr: ValueExpr<R> }
  | { readonly kind: "and"; readonly conditions: readonly PermissionExpr<R>[] }
  | { readonly kind: "or"; readonly conditions: readonly PermissionExpr<R>[] }
  | { readonly kind: "not"; readonly condition: PermissionExpr<R> };

export type PermissionContext = {
  readonly currentUserId: UserId;
};

export type ResourcePermissions<R extends Resource, A extends string> = Readonly<
  Record<A, PermissionExpr<R>>
>;
