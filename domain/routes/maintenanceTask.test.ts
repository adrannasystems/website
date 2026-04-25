import { describe, expect, it } from "vitest";
import { maintenanceTaskRoute } from "./maintenanceTask";

describe("maintenanceTaskRoute.buildUrl", () => {
  it("adds the task query parameter to the origin", () => {
    expect(maintenanceTaskRoute.buildUrl("https://example.com", "task-1")).toBe(
      "https://example.com/?task=task-1",
    );
  });

  it("handles a trailing slash in the origin", () => {
    expect(maintenanceTaskRoute.buildUrl("https://example.com/", "task-1")).toBe(
      "https://example.com/?task=task-1",
    );
  });
});
