import { describe, it, expect } from "vitest";
import { aggregateRecipeIngredients } from "./aggregateRecipeIngredients";

describe("aggregateRecipeIngredients", () => {
  it("sums the same ingredient across steps", () => {
    expect(
      aggregateRecipeIngredients([
        { ingredientId: "soy", amount: 3 },
        { ingredientId: "soy", amount: 2 },
      ]),
    ).toEqual([{ ingredientId: "soy", amount: 5 }]);
  });

  it("keeps different ingredients as separate lines", () => {
    expect(
      aggregateRecipeIngredients([
        { ingredientId: "milk", amount: 30 },
        { ingredientId: "soy", amount: 1 },
      ]),
    ).toEqual([
      { ingredientId: "milk", amount: 30 },
      { ingredientId: "soy", amount: 1 },
    ]);
  });

  it("returns an empty list when there are no ingredient lines", () => {
    expect(aggregateRecipeIngredients([])).toEqual([]);
  });
});
