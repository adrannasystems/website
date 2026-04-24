import type { PermissionContext, PermissionExpr, ScalarValue, ValueExpr } from "./types";

function resolveValue<R extends Record<string, ScalarValue>>(
  expr: ValueExpr<R>,
  resource: R,
  ctx: PermissionContext,
): ScalarValue {
  switch (expr.kind) {
    case "field":
      return resource[expr.path];
    case "literal":
      return expr.value;
    case "currentUser":
      return ctx.currentUserId;
    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error("Unhandled ValueExpr kind: " + String(_exhaustiveCheck));
    }
  }
}

export function evaluatePermission<R extends Record<string, ScalarValue>>(
  expr: PermissionExpr<R>,
  resource: R,
  ctx: PermissionContext,
): boolean {
  switch (expr.kind) {
    case "always":
      return true;
    case "never":
      return false;
    case "eq":
      return resolveValue(expr.left, resource, ctx) === resolveValue(expr.right, resource, ctx);
    case "neq":
      return resolveValue(expr.left, resource, ctx) !== resolveValue(expr.right, resource, ctx);
    case "isTrue":
      return resolveValue(expr.expr, resource, ctx) === true;
    case "and":
      return expr.conditions.every((c) => evaluatePermission(c, resource, ctx));
    case "or":
      return expr.conditions.some((c) => evaluatePermission(c, resource, ctx));
    case "not":
      return !evaluatePermission(expr.condition, resource, ctx);
    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error("Unhandled PermissionExpr kind: " + String(_exhaustiveCheck));
    }
  }
}

// Returns a predicate closed over the context, ready to use with Array.filter etc.
export function makePermissionPredicate<R extends Record<string, ScalarValue>>(
  expr: PermissionExpr<R>,
  ctx: PermissionContext,
): (resource: R) => boolean {
  return (resource) => evaluatePermission(expr, resource, ctx);
}
