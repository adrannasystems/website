import { describe, expect, it } from "vitest";
import { evaluatePermission } from "./interpreter";
import { executionPermissions } from "./execution";
import { taskPermissions } from "./task";
import type { ExecutionResource, PermissionContext, TaskResource } from "./types";

const owner = "user-owner";
const other = "user-other";

describe("evaluatePermission — expression kinds", () => {
  const resource = task();

  it("always → true", () => {
    expect(evaluatePermission({ kind: "always" }, resource, ctx(other))).toBe(true);
  });

  it("never → false", () => {
    expect(evaluatePermission({ kind: "never" }, resource, ctx(owner))).toBe(false);
  });

  it("eq: field matches currentUser", () => {
    const expr = {
      kind: "eq" as const,
      left: { kind: "field" as const, path: "ownerId" as const },
      right: { kind: "currentUser" as const },
    };
    expect(evaluatePermission(expr, resource, ctx(owner))).toBe(true);
    expect(evaluatePermission(expr, resource, ctx(other))).toBe(false);
  });

  it("eq: field matches literal", () => {
    const expr = {
      kind: "eq" as const,
      left: { kind: "field" as const, path: "ownerId" as const },
      right: { kind: "literal" as const, value: owner },
    };
    expect(evaluatePermission(expr, resource, ctx(other))).toBe(true);
  });

  it("neq: negated equality", () => {
    const expr = {
      kind: "neq" as const,
      left: { kind: "field" as const, path: "ownerId" as const },
      right: { kind: "currentUser" as const },
    };
    expect(evaluatePermission(expr, resource, ctx(other))).toBe(true);
    expect(evaluatePermission(expr, resource, ctx(owner))).toBe(false);
  });

  it("isTrue: true when field is true", () => {
    const shared = task({ isShared: true });
    const expr = {
      kind: "isTrue" as const,
      expr: { kind: "field" as const, path: "isShared" as const },
    };
    expect(evaluatePermission(expr, shared, ctx(other))).toBe(true);
    expect(evaluatePermission(expr, resource, ctx(other))).toBe(false);
  });

  it("and: true only when all conditions hold", () => {
    const expr = {
      kind: "and" as const,
      conditions: [{ kind: "always" as const }, { kind: "never" as const }],
    };
    expect(evaluatePermission(expr, resource, ctx(owner))).toBe(false);
    const allTrue = {
      kind: "and" as const,
      conditions: [{ kind: "always" as const }, { kind: "always" as const }],
    };
    expect(evaluatePermission(allTrue, resource, ctx(owner))).toBe(true);
  });

  it("or: true when any condition holds", () => {
    const expr = {
      kind: "or" as const,
      conditions: [{ kind: "never" as const }, { kind: "always" as const }],
    };
    expect(evaluatePermission(expr, resource, ctx(owner))).toBe(true);
    const allFalse = {
      kind: "or" as const,
      conditions: [{ kind: "never" as const }, { kind: "never" as const }],
    };
    expect(evaluatePermission(allFalse, resource, ctx(owner))).toBe(false);
  });

  it("not: inverts the condition", () => {
    expect(
      evaluatePermission({ kind: "not", condition: { kind: "always" } }, resource, ctx(owner)),
    ).toBe(false);
    expect(
      evaluatePermission({ kind: "not", condition: { kind: "never" } }, resource, ctx(owner)),
    ).toBe(true);
  });
});

describe("taskPermissions.view", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.view, task(), ctx(owner))).toBe(true);
  });

  it("allows a non-owner when the task is shared", () => {
    expect(evaluatePermission(taskPermissions.view, task({ isShared: true }), ctx(other))).toBe(
      true,
    );
  });

  it("denies a non-owner when the task is not shared", () => {
    expect(evaluatePermission(taskPermissions.view, task(), ctx(other))).toBe(false);
  });
});

describe("taskPermissions.execute", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.execute, task(), ctx(owner))).toBe(true);
  });

  it("allows a non-owner when the task is shared", () => {
    expect(evaluatePermission(taskPermissions.execute, task({ isShared: true }), ctx(other))).toBe(
      true,
    );
  });

  it("denies a non-owner when the task is not shared", () => {
    expect(evaluatePermission(taskPermissions.execute, task(), ctx(other))).toBe(false);
  });
});

describe("taskPermissions.edit", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.edit, task(), ctx(owner))).toBe(true);
  });

  it("denies a non-owner even when the task is shared", () => {
    expect(evaluatePermission(taskPermissions.edit, task({ isShared: true }), ctx(other))).toBe(
      false,
    );
  });
});

describe("taskPermissions.archive", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.archive, task(), ctx(owner))).toBe(true);
  });

  it("denies a non-owner even when the task is shared", () => {
    expect(evaluatePermission(taskPermissions.archive, task({ isShared: true }), ctx(other))).toBe(
      false,
    );
  });
});

describe("taskPermissions.delete", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.delete, task(), ctx(owner))).toBe(true);
  });

  it("denies a non-owner even when the task is shared", () => {
    expect(evaluatePermission(taskPermissions.delete, task({ isShared: true }), ctx(other))).toBe(
      false,
    );
  });
});

describe("taskPermissions.setNotifications", () => {
  it("allows the owner", () => {
    expect(evaluatePermission(taskPermissions.setNotifications, task(), ctx(owner))).toBe(true);
  });

  it("denies a non-owner even when the task is shared", () => {
    expect(
      evaluatePermission(taskPermissions.setNotifications, task({ isShared: true }), ctx(other)),
    ).toBe(false);
  });
});

describe("executionPermissions.view", () => {
  it("allows the task owner", () => {
    expect(evaluatePermission(executionPermissions.view, execution(), ctx(owner))).toBe(true);
  });

  it("allows a non-owner when the task is shared", () => {
    expect(
      evaluatePermission(executionPermissions.view, execution({ isTaskShared: true }), ctx(other)),
    ).toBe(true);
  });

  it("denies a non-owner when the task is not shared", () => {
    expect(evaluatePermission(executionPermissions.view, execution(), ctx(other))).toBe(false);
  });
});

describe("executionPermissions.delete", () => {
  it("allows the task owner", () => {
    expect(evaluatePermission(executionPermissions.delete, execution(), ctx(owner))).toBe(true);
  });

  it("denies a non-owner even when the task is shared", () => {
    expect(
      evaluatePermission(
        executionPermissions.delete,
        execution({ isTaskShared: true }),
        ctx(other),
      ),
    ).toBe(false);
  });
});

function ctx(currentUserId: string): PermissionContext {
  return { currentUserId };
}

function task(overrides: Partial<TaskResource> = {}): TaskResource {
  return { ownerId: owner, isShared: false, isArchived: false, ...overrides };
}

function execution(overrides: Partial<ExecutionResource> = {}): ExecutionResource {
  return { taskOwnerId: owner, isTaskShared: false, ...overrides };
}
