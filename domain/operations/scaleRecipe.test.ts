import { describe, it, expect } from "vitest";
import { scaleAmount } from "./scaleRecipe";

describe("scaleAmount", () => {
  it("multiplies the stored amount by the factor", () => {
    expect(scaleAmount(1, 1.5)).toBe(1.5);
  });

  it("returns the original amount when the factor is 1", () => {
    expect(scaleAmount(3, 1)).toBe(3);
  });
});
