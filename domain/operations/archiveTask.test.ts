import { describe, expect, it } from "vitest";
import { archiveTask, unarchiveTask } from "./archiveTask";
import type { Id, MaintenanceTaskModel } from "../models/MaintenanceTask";
import { randomUUID } from "crypto";
import { err, ok } from "neverthrow";

describe("archiveTask", () => {
  it("allows owners to archive their own task", () => {
    const result = archiveTask(makeTask({ userId: "user1" }), "user1", 1234);
    expect(result).toStrictEqual(ok({ archivedAt: 1234 }));
  });

  it("allows non-owners to archive a shared task", () => {
    const result = archiveTask(makeTask({ userId: "userA", isShared: true }), "userB", 1234);
    expect(result).toStrictEqual(ok({ archivedAt: 1234 }));
  });

  it("returns unauthorized when non-owner archives a private task", () => {
    const result = archiveTask(makeTask({ userId: "userA", isShared: false }), "userB", 1234);
    expect(result).toStrictEqual(err("unauthorized"));
  });
});

describe("unarchiveTask", () => {
  it("allows owners to unarchive their own task", () => {
    const result = unarchiveTask(
      makeTask({ userId: "user1", isArchived: true, archivedAt: 1000 }),
      "user1",
    );
    expect(result).toEqual(ok({ archivedAt: null }));
  });

  it("allows non-owners to unarchive a shared task", () => {
    const result = unarchiveTask(
      makeTask({ userId: "userA", isArchived: true, archivedAt: 1000, isShared: true }),
      "userB",
    );
    expect(result).toStrictEqual(ok({ archivedAt: null }));
  });

  it("returns unauthorized when non-owner unarchives a private task", () => {
    const result = unarchiveTask(
      makeTask({ userId: "userA", isArchived: true, archivedAt: 1000, isShared: false }),
      "userB",
    );
    expect(result).toStrictEqual(err("unauthorized"));
  });
});

function makeTask(overrides: Partial<MaintenanceTaskModel> = {}): MaintenanceTaskModel {
  return {
    id: randomUUID() as Id<"maintenanceTasks">,
    userId: randomUUID(),
    name: randomUUID(),
    periodHours: Math.floor(Math.random() * 1000),
    lastExecutedAt: Math.floor(Math.random() * 1000000),
    isArchived: Math.random() < 0.5,
    archivedAt: Math.random() < 0.5 ? Math.floor(Math.random() * 1000000) : null,
    isShared: Math.random() < 0.5,
    notificationsEnabled: Math.random() < 0.5,
    state:
      Math.random() < 0.5
        ? "Never Done"
        : Math.random() < 0.5
          ? "All Good"
          : Math.random() < 0.5
            ? "Due"
            : "Overdue",
    periodsDue: Math.random() < 0.5 ? Number.POSITIVE_INFINITY : Math.floor(Math.random() * 100),
    ...overrides,
  };
}
