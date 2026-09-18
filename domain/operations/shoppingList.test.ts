import { describe, it, expect } from "vitest";
import {
  annotateRecipeIngredientsWithPresence,
  mergeShoppingAdd,
  recipeIngredientLinesAtScale,
  sortShoppingList,
} from "./shoppingList";
import { VEGGIES_SORT_RANK } from "../models/recipe";

describe("mergeShoppingAdd", () => {
  it("inserts a new line when the ingredient is not on the list", () => {
    expect(mergeShoppingAdd([], { ingredientId: "soy", unit: "g", amount: 3 })).toEqual([
      { ingredientId: "soy", unit: "g", amount: 3 },
    ]);
  });

  it("sums amounts when the same ingredient and unit are already on the list", () => {
    expect(
      mergeShoppingAdd([{ ingredientId: "soy", unit: "g", amount: 3 }], {
        ingredientId: "soy",
        unit: "g",
        amount: 2,
      }),
    ).toEqual([{ ingredientId: "soy", unit: "g", amount: 5 }]);
  });

  it("adds a separate line when the unit differs", () => {
    expect(
      mergeShoppingAdd([{ ingredientId: "milk", unit: "ml", amount: 30 }], {
        ingredientId: "milk",
        unit: "cup",
        amount: 1,
      }),
    ).toEqual([
      { ingredientId: "milk", unit: "ml", amount: 30 },
      { ingredientId: "milk", unit: "cup", amount: 1 },
    ]);
  });
});

describe("annotateRecipeIngredientsWithPresence", () => {
  it("marks an ingredient as on the list when any list line uses that ingredient", () => {
    expect(
      annotateRecipeIngredientsWithPresence(
        [
          { ingredientId: "soy", amount: 3 },
          { ingredientId: "milk", amount: 30 },
        ],
        ["soy"],
      ),
    ).toEqual([
      { ingredientId: "soy", amount: 3, onList: true },
      { ingredientId: "milk", amount: 30, onList: false },
    ]);
  });
});

describe("recipeIngredientLinesAtScale", () => {
  it("scales every line by the factor", () => {
    expect(
      recipeIngredientLinesAtScale([{ ingredientId: "meat", unit: "kg", amount: 1 }], 1.5),
    ).toEqual([{ ingredientId: "meat", unit: "kg", amount: 1.5 }]);
  });
});

describe("sortShoppingList", () => {
  it("puts unchecked items first, then veggies before uncategorized, then name", () => {
    const tomato = {
      id: "1",
      ingredientId: "tomato",
      name: "Tomato",
      checked: false,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const cucumber = {
      id: "2",
      ingredientId: "cucumber",
      name: "Cucumber",
      checked: false,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const soy = {
      id: "3",
      ingredientId: "soy",
      name: "Soy sauce",
      checked: false,
      categorySortRank: null,
    };
    const checkedVeg = {
      id: "4",
      ingredientId: "onion",
      name: "Onion",
      checked: true,
      categorySortRank: VEGGIES_SORT_RANK,
    };

    expect(sortShoppingList([soy, checkedVeg, tomato, cucumber]).map((item) => item.id)).toEqual([
      "2",
      "1",
      "3",
      "4",
    ]);
  });
});
