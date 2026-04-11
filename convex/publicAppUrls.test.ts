import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { buildMaintenanceTaskDeepLink } from "./publicAppUrls";

describe("buildMaintenanceTaskDeepLink", () => {
  it("adds the task query parameter to the public app origin", () => {
    expect(
      buildMaintenanceTaskDeepLink("https://example.com", "task-1" as Id<"maintenanceTasks">),
    ).toBe("https://example.com/?task=task-1");
  });

  it("preserves a trailing slash in the public app origin", () => {
    expect(
      buildMaintenanceTaskDeepLink("https://example.com/", "task-1" as Id<"maintenanceTasks">),
    ).toBe("https://example.com/?task=task-1");
  });
});
