import type { UserId } from "../models/MaintenanceTask";

export type ScalarValue = string | number | boolean | null;

// --- Resource descriptors ---
// Each resource type exposes the properties available for permission checks.
// The Record<string, ScalarValue> constraint lets the interpreter index into
// any resource without a cast — TypeScript can prove R[k] extends ScalarValue.

export type TaskResource = {
  readonly ownerId: UserId;
  readonly isShared: boolean;
  readonly isArchived: boolean;
};

export type ExecutionResource = {
  readonly taskOwnerId: UserId;
  readonly isTaskShared: boolean;
};

// --- Expression tree ---
// A permission is an expression tree (not a plain function) so it can be
// both evaluated in-process and translated into a database query filter.

// Leaf value that can appear on either side of a comparison.
export type ValueExpr<R extends Record<string, ScalarValue>> =
  | { readonly kind: "field"; readonly path: keyof R & string }
  | { readonly kind: "literal"; readonly value: ScalarValue }
  | { readonly kind: "currentUser" };

// Boolean condition node.
export type PermissionExpr<R extends Record<string, ScalarValue>> =
  | { readonly kind: "always" }
  | { readonly kind: "never" }
  | { readonly kind: "eq"; readonly left: ValueExpr<R>; readonly right: ValueExpr<R> }
  | { readonly kind: "neq"; readonly left: ValueExpr<R>; readonly right: ValueExpr<R> }
  | { readonly kind: "isTrue"; readonly expr: ValueExpr<R> }
  | { readonly kind: "and"; readonly conditions: readonly PermissionExpr<R>[] }
  | { readonly kind: "or"; readonly conditions: readonly PermissionExpr<R>[] }
  | { readonly kind: "not"; readonly condition: PermissionExpr<R> };

// Runtime context supplied to the interpreter.
export type PermissionContext = {
  readonly currentUserId: UserId;
};

// Maps action names to their permission expressions for a resource type.
export type ResourcePermissions<
  R extends Record<string, ScalarValue>,
  A extends string,
> = Readonly<Record<A, PermissionExpr<R>>>;
