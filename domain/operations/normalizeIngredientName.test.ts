import { describe, it, expect } from "vitest";
import { normalizeIngredientName } from "./normalizeIngredientName";

describe("normalizeIngredientName", () => {
  it("trims and lowercases", () => {
    expect(normalizeIngredientName("  Soy Sauce ")).toBe("soy sauce");
  });

  it("leaves an already-normalized name unchanged", () => {
    expect(normalizeIngredientName("milk")).toBe("milk");
  });
});
