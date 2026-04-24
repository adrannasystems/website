import type { PermissionContext, PermissionExpr, Resource, ValueExpr } from "./types";

export function evaluatePermission<R extends Resource>(
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
      return expr.conditions.every((condition) => evaluatePermission(condition, resource, ctx));
    case "or":
      return expr.conditions.some((condition) => evaluatePermission(condition, resource, ctx));
    case "not":
      return !evaluatePermission(expr.condition, resource, ctx);
    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error("Unhandled PermissionExpr kind: " + String(_exhaustiveCheck));
    }
  }
}

export function makePermissionPredicate<R extends Resource>(
  expr: PermissionExpr<R>,
  ctx: PermissionContext,
): (resource: R) => boolean {
  return (resource) => evaluatePermission(expr, resource, ctx);
}

function resolveValue<R extends Resource>(expr: ValueExpr<R>, resource: R, ctx: PermissionContext) {
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
