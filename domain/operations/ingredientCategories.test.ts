import { describe, expect, it } from "vitest";
import { sortRanksForCategoryOrder } from "./ingredientCategories";

describe("sortRanksForCategoryOrder", () => {
  it("assigns 0-based ranks for a permutation of the existing ids", () => {
    expect(sortRanksForCategoryOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual(
      new Map([
        ["c", 0],
        ["a", 1],
        ["b", 2],
      ]),
    );
  });

  it("rejects a different length, duplicates, or unknown ids", () => {
    expect(sortRanksForCategoryOrder(["a", "b"], ["a"])).toBeNull();
    expect(sortRanksForCategoryOrder(["a", "b"], ["a", "a"])).toBeNull();
    expect(sortRanksForCategoryOrder(["a", "b"], ["a", "c"])).toBeNull();
  });
});
