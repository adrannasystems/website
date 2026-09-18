import { describe, it, expect } from "vitest";
import { scaleAmount, scaleFactorFromReference } from "./scaleRecipe";

describe("scaleAmount", () => {
  it("multiplies the stored amount by the factor", () => {
    expect(scaleAmount(1, 1.5)).toBe(1.5);
  });

  it("returns the original amount when the factor is 1", () => {
    expect(scaleAmount(3, 1)).toBe(3);
  });
});

describe("scaleFactorFromReference", () => {
  it("computes the factor from 1 kg to 1.5 kg", () => {
    expect(scaleFactorFromReference(1, 1.5)._unsafeUnwrap()).toBe(1.5);
  });

  it("returns zeroOriginal when the reference amount is 0", () => {
    expect(scaleFactorFromReference(0, 1.5)._unsafeUnwrapErr()).toBe("zeroOriginal");
  });
});
