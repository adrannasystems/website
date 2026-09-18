import { describe, it, expect } from "vitest";
import {
  amountOrZero,
  groupShoppingList,
  markDoneHave,
  neededAmount,
  recipeIngredientLinesAtScale,
  sortShoppingList,
  toBuyAmount,
} from "./shoppingList";
import { VEGGIES_SORT_RANK } from "../models/recipe";

describe("amountOrZero", () => {
  it("treats missing as 0", () => {
    expect(amountOrZero(undefined)).toBe(0);
    expect(amountOrZero(2)).toBe(2);
  });
});

describe("neededAmount and toBuyAmount", () => {
  it("adds extra to planned and subtracts have, never below 0", () => {
    expect(neededAmount(1, 5)).toBe(6);
    expect(toBuyAmount(6, 2)).toBe(4);
    expect(toBuyAmount(6, 8)).toBe(0);
  });
});

describe("markDoneHave", () => {
  it("sets have to needed", () => {
    expect(markDoneHave(6)).toBe(6);
  });
});

describe("recipeIngredientLinesAtScale", () => {
  it("scales every line by the factor", () => {
    expect(recipeIngredientLinesAtScale([{ ingredientId: "meat", amount: 1 }], 1.5)).toEqual([
      { ingredientId: "meat", amount: 1.5 },
    ]);
  });
});

describe("sortShoppingList", () => {
  it("puts toBuy > 0 first, then veggies before uncategorized, then name", () => {
    const tomato = {
      id: "1",
      ingredientId: "tomato",
      name: "Tomato",
      toBuy: 2,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const cucumber = {
      id: "2",
      ingredientId: "cucumber",
      name: "Cucumber",
      toBuy: 1,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const soy = {
      id: "3",
      ingredientId: "soy",
      name: "Soy sauce",
      toBuy: 4,
      categorySortRank: null,
    };
    const doneVeg = {
      id: "4",
      ingredientId: "onion",
      name: "Onion",
      toBuy: 0,
      categorySortRank: VEGGIES_SORT_RANK,
    };

    expect(sortShoppingList([soy, doneVeg, tomato, cucumber]).map((item) => item.id)).toEqual([
      "2",
      "1",
      "3",
      "4",
    ]);
  });
});

describe("groupShoppingList", () => {
  const tomato = {
    id: "1",
    name: "Tomato",
    toBuy: 2,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const cucumber = {
    id: "2",
    name: "Cucumber",
    toBuy: 1,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const soy = {
    id: "3",
    name: "Soy sauce",
    toBuy: 4,
    categoryId: null,
    categoryName: null,
  };
  const onion = {
    id: "4",
    name: "Onion",
    toBuy: 0,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const flour = {
    id: "5",
    name: "Flour",
    toBuy: 0,
    categoryId: "bake",
    categoryName: "Backen",
  };

  it("splits by toBuy and groups adjacent categories in input order", () => {
    const grouped = groupShoppingList([cucumber, tomato, soy, onion, flour]);
    expect(grouped.toBuy.map((group) => group.categoryId)).toEqual(["veg", null]);
    expect(grouped.toBuy[0]?.items.map((item) => item.id)).toEqual(["2", "1"]);
    expect(grouped.toBuy[1]?.items.map((item) => item.id)).toEqual(["3"]);
    expect(grouped.rest.map((group) => group.categoryId)).toEqual(["veg", "bake"]);
    expect(grouped.rest[0]?.items.map((item) => item.id)).toEqual(["4"]);
    expect(grouped.rest[1]?.items.map((item) => item.id)).toEqual(["5"]);
  });

  it("keeps uncategorized as its own group", () => {
    const grouped = groupShoppingList([soy]);
    expect(grouped.toBuy).toEqual([{ categoryId: null, categoryName: null, items: [soy] }]);
    expect(grouped.rest).toEqual([]);
  });

  it("returns empty super-sections when there are no matching items", () => {
    expect(groupShoppingList([onion])).toEqual({
      toBuy: [],
      rest: [{ categoryId: "veg", categoryName: "Gemüse", items: [onion] }],
    });
  });
});
