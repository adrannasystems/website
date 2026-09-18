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
    expect(toiletPaper).toEqual([
      { name: "Toilettenpapier", categoryName: "Drogerie", checked: true },
    ]);
  });

  it("leaves items with no section uncategorized", () => {
    expect(catalog.ingredients).toContainEqual({
      name: "Wein",
      categoryName: null,
      checked: true,
    });
  });

  it("maps Done Yes to checked and other Done values to unchecked", () => {
    expect(catalog.ingredients).toContainEqual({
      name: "Radieschen",
      categoryName: "Gemüse",
      checked: false,
    });
    expect(catalog.ingredients.filter((ingredient) => ingredient.checked === true)).toHaveLength(
      243,
    );
    expect(catalog.ingredients.filter((ingredient) => ingredient.checked === false)).toHaveLength(
      9,
    );
  });

  it("keeps the first occurrence of a duplicate name including Done", () => {
    const parsed = parseEinkaufCsv(`Done,Item,Section,later
Yes,Duplicate,Drogerie,No
No,Duplicate,Haushalt,No
No,Second Duplicate,Drogerie,No
Yes,Second Duplicate,Haushalt,No
`);
    expect(parsed.ingredients).toEqual([
      { name: "Duplicate", categoryName: "Drogerie", checked: true },
      { name: "Second Duplicate", categoryName: "Drogerie", checked: false },
    ]);
  });

  it("treats a missing Done column as unchecked", () => {
    const parsed = parseEinkaufCsv(`Item,Section,later
Foo,Gemüse,No
`);
    expect(parsed.ingredients).toEqual([{ name: "Foo", categoryName: "Gemüse", checked: false }]);
  });
});
