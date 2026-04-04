import { describe, it, expect } from "vitest";
import { executeTask } from "./executeTask";
import type { MaintenanceTaskModel } from "../models/MaintenanceTask";
import type { Id } from "../models/MaintenanceTask";

function makeTask(overrides: Partial<MaintenanceTaskModel> = {}): MaintenanceTaskModel {
  return {
    id: "task1" as Id<"maintenanceTasks">,
    userId: "user1",
    name: "Oil change",
    periodHours: 720,
    lastExecutedAt: null,
    isArchived: false,
    archivedAt: null,
    isShared: false,
    notificationsEnabled: true,
    state: "Never Done",
    periodsDue: Infinity,
    ...overrides,
  };
}

describe("executeTask", () => {
  it("returns archived error when task is archived", () => {
    const result = executeTask(makeTask({ isArchived: true }), "user1", Date.now());
    expect(result._unsafeUnwrapErr()).toBe("archived");
  });

  it("returns unauthorized when non-owner tries to execute a private task", () => {
    const result = executeTask(makeTask({ isShared: false }), "other", Date.now());
    expect(result._unsafeUnwrapErr()).toBe("unauthorized");
  });

  it("allows non-owner to execute a shared task", () => {
    const result = executeTask(makeTask({ isShared: true }), "other", Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("owner can execute their own task", () => {
    const result = executeTask(makeTask(), "user1", Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("sets updateLastExecutedAt=true when task has no prior execution", () => {
    const result = executeTask(makeTask({ lastExecutedAt: null }), "user1", 1000);
    expect(result._unsafeUnwrap().updateLastExecutedAt).toBe(true);
  });

  it("sets updateLastExecutedAt=true when executedAt is newer than current", () => {
    const result = executeTask(makeTask({ lastExecutedAt: 500 }), "user1", 1000);
    expect(result._unsafeUnwrap().updateLastExecutedAt).toBe(true);
  });

  it("sets updateLastExecutedAt=false when executedAt is older than current", () => {
    const result = executeTask(makeTask({ lastExecutedAt: 2000 }), "user1", 1000);
    expect(result._unsafeUnwrap().updateLastExecutedAt).toBe(false);
  });

  it("returns the executedAt value in the result", () => {
    const result = executeTask(makeTask(), "user1", 1234);
    expect(result._unsafeUnwrap().executedAt).toBe(1234);
  });
});
