import { describe, it, expect } from "vitest";
import {
  amountOrZero,
  groupShoppingList,
  isParked,
  markDoneHave,
  neededAmount,
  recipeIngredientLinesAtScale,
  sortShoppingList,
  toBuyAmount,
} from "./shoppingList";
import { VEGGIES_SORT_RANK } from "../models/recipe";

describe("isParked", () => {
  it("is true only for explicit true", () => {
    expect(isParked(true)).toBe(true);
    expect(isParked(false)).toBe(false);
    expect(isParked(undefined)).toBe(false);
  });
});

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
      parked: false,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const cucumber = {
      id: "2",
      ingredientId: "cucumber",
      name: "Cucumber",
      toBuy: 1,
      parked: false,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const soy = {
      id: "3",
      ingredientId: "soy",
      name: "Soy sauce",
      toBuy: 4,
      parked: false,
      categorySortRank: null,
    };
    const doneVeg = {
      id: "4",
      ingredientId: "onion",
      name: "Onion",
      toBuy: 0,
      parked: false,
      categorySortRank: VEGGIES_SORT_RANK,
    };

    expect(sortShoppingList([soy, doneVeg, tomato, cucumber]).map((item) => item.id)).toEqual([
      "2",
      "1",
      "3",
      "4",
    ]);
  });

  it("puts parked to-buy after non-parked to-buy, and ignores parked for rest", () => {
    const tomato = {
      id: "1",
      ingredientId: "tomato",
      name: "Tomato",
      toBuy: 2,
      parked: true,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const soy = {
      id: "3",
      ingredientId: "soy",
      name: "Soy sauce",
      toBuy: 4,
      parked: false,
      categorySortRank: null,
    };
    const onion = {
      id: "4",
      ingredientId: "onion",
      name: "Onion",
      toBuy: 0,
      parked: true,
      categorySortRank: VEGGIES_SORT_RANK,
    };
    const flour = {
      id: "5",
      ingredientId: "flour",
      name: "Flour",
      toBuy: 0,
      parked: false,
      categorySortRank: 14,
    };

    expect(sortShoppingList([tomato, flour, onion, soy]).map((item) => item.id)).toEqual([
      "3",
      "1",
      "4",
      "5",
    ]);
  });
});

describe("groupShoppingList", () => {
  const tomato = {
    id: "1",
    name: "Tomato",
    toBuy: 2,
    parked: false,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const cucumber = {
    id: "2",
    name: "Cucumber",
    toBuy: 1,
    parked: false,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const soy = {
    id: "3",
    name: "Soy sauce",
    toBuy: 4,
    parked: false,
    categoryId: null,
    categoryName: null,
  };
  const onion = {
    id: "4",
    name: "Onion",
    toBuy: 0,
    parked: false,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const flour = {
    id: "5",
    name: "Flour",
    toBuy: 0,
    parked: false,
    categoryId: "bake",
    categoryName: "Backen",
  };
  const parkedTomato = {
    id: "6",
    name: "Parked tomato",
    toBuy: 3,
    parked: true,
    categoryId: "veg",
    categoryName: "Gemüse",
  };
  const parkedOnion = {
    id: "7",
    name: "Parked onion",
    toBuy: 0,
    parked: true,
    categoryId: "veg",
    categoryName: "Gemüse",
  };

  it("splits by toBuy and groups adjacent categories in input order", () => {
    const grouped = groupShoppingList([cucumber, tomato, soy, onion, flour]);
    expect(grouped.toBuy.map((group) => group.categoryId)).toEqual(["veg", null]);
    expect(grouped.toBuy[0]?.items.map((item) => item.id)).toEqual(["2", "1"]);
    expect(grouped.toBuy[1]?.items.map((item) => item.id)).toEqual(["3"]);
    expect(grouped.parked).toEqual([]);
    expect(grouped.rest.map((group) => group.categoryId)).toEqual(["veg", "bake"]);
    expect(grouped.rest[0]?.items.map((item) => item.id)).toEqual(["4"]);
    expect(grouped.rest[1]?.items.map((item) => item.id)).toEqual(["5"]);
  });

  it("puts parked to-buy in the parked section and keeps parked rest in rest", () => {
    const grouped = groupShoppingList([parkedTomato, cucumber, parkedOnion, onion]);
    expect(grouped.toBuy[0]?.items.map((item) => item.id)).toEqual(["2"]);
    expect(grouped.parked[0]?.items.map((item) => item.id)).toEqual(["6"]);
    expect(grouped.rest[0]?.items.map((item) => item.id)).toEqual(["7", "4"]);
  });

  it("keeps uncategorized as its own group", () => {
    const grouped = groupShoppingList([soy]);
    expect(grouped.toBuy).toEqual([{ categoryId: null, categoryName: null, items: [soy] }]);
    expect(grouped.parked).toEqual([]);
    expect(grouped.rest).toEqual([]);
  });

  it("returns empty super-sections when there are no matching items", () => {
    expect(groupShoppingList([onion])).toEqual({
      toBuy: [],
      parked: [],
      rest: [{ categoryId: "veg", categoryName: "Gemüse", items: [onion] }],
    });
  });
});
