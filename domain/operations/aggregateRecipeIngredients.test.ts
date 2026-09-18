import { describe, it, expect } from "vitest";
import { aggregateRecipeIngredients } from "./aggregateRecipeIngredients";

describe("aggregateRecipeIngredients", () => {
  it("sums the same ingredient and unit across steps", () => {
    expect(
      aggregateRecipeIngredients([
        { ingredientId: "soy", unit: "g", amount: 3 },
        { ingredientId: "soy", unit: "g", amount: 2 },
      ]),
    ).toEqual([{ ingredientId: "soy", unit: "g", amount: 5 }]);
  });

  it("keeps the same ingredient in different units as separate lines", () => {
    expect(
      aggregateRecipeIngredients([
        { ingredientId: "milk", unit: "ml", amount: 30 },
        { ingredientId: "milk", unit: "cup", amount: 1 },
      ]),
    ).toEqual([
      { ingredientId: "milk", unit: "ml", amount: 30 },
      { ingredientId: "milk", unit: "cup", amount: 1 },
    ]);
  });

  it("returns an empty list when there are no ingredient lines", () => {
    expect(aggregateRecipeIngredients([])).toEqual([]);
  });
});
