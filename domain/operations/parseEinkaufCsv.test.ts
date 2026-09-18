import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseEinkaufCsv } from "./parseEinkaufCsv";
import { VEGGIES_CATEGORY_NAME, VEGGIES_SORT_RANK } from "../models/recipe";

describe("parseEinkaufCsv", () => {
  const catalog = parseEinkaufCsv(readFileSync("einkauf.csv", "utf8"));

  it("puts Gemüse first", () => {
    expect(catalog.categories[0]).toEqual({
      name: VEGGIES_CATEGORY_NAME,
      sortRank: VEGGIES_SORT_RANK,
    });
  });

  it("keeps the first occurrence of a duplicate name", () => {
    const toiletPaper = catalog.ingredients.filter(
      (ingredient) => ingredient.name === "Toilettenpapier",
    );
    expect(toiletPaper).toEqual([{ name: "Toilettenpapier", categoryName: "Drogerie" }]);
  });

  it("leaves items with no section uncategorized", () => {
    expect(catalog.ingredients).toContainEqual({ name: "Wein", categoryName: null });
  });
});
