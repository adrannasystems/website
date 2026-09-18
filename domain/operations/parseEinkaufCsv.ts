import { VEGGIES_CATEGORY_NAME, VEGGIES_SORT_RANK } from "../models/recipe";
import { normalizeIngredientName } from "./normalizeIngredientName";

export type EinkaufCategory = {
  name: string;
  sortRank: number;
};

export type EinkaufIngredient = {
  name: string;
  categoryName: string | null;
};

export type EinkaufCatalog = {
  categories: EinkaufCategory[];
  ingredients: EinkaufIngredient[];
};

export function parseEinkaufCsv(csvText: string): EinkaufCatalog {
  const rows = parseCsv(stripBom(csvText));
  const header = rows[0];
  if (header === undefined) {
    throw new Error("einkauf.csv is empty");
  }
  const itemIndex = header.indexOf("Item");
  const sectionIndex = header.indexOf("Section");
  const laterIndex = header.indexOf("later");
  if (itemIndex === -1 || sectionIndex === -1) {
    throw new Error("einkauf.csv must have Item and Section columns");
  }

  const ingredients: EinkaufIngredient[] = [];
  const seenNames = new Set<string>();
  const primarySectionOrder: string[] = [];
  const seenPrimarySections = new Set<string>();
  const allSectionOrder: string[] = [];
  const seenSections = new Set<string>();

  for (const row of rows.slice(1)) {
    const rawName = row[itemIndex];
    if (rawName === undefined) {
      continue;
    }
    const name = rawName.trim();
    if (name === "") {
      continue;
    }
    const normalizedName = normalizeIngredientName(name);
    if (seenNames.has(normalizedName)) {
      continue;
    }
    seenNames.add(normalizedName);
    const rawSection = row[sectionIndex];
    const categoryName =
      rawSection === undefined || rawSection.trim() === "" ? null : rawSection.trim();
    const later = laterIndex === -1 ? "No" : (row[laterIndex] ?? "No").trim();
    if (categoryName !== null) {
      if (seenSections.has(categoryName) === false) {
        seenSections.add(categoryName);
        allSectionOrder.push(categoryName);
      }
      if (later !== "Yes" && seenPrimarySections.has(categoryName) === false) {
        seenPrimarySections.add(categoryName);
        primarySectionOrder.push(categoryName);
      }
    }
    ingredients.push({ name, categoryName });
  }

  const trailingSections = allSectionOrder.filter(
    (section) => seenPrimarySections.has(section) === false,
  );
  const categories = rankedCategories([...primarySectionOrder, ...trailingSections]);
  return { categories, ingredients };
}

function rankedCategories(sectionOrder: string[]): EinkaufCategory[] {
  const withoutVeggies = sectionOrder.filter((name) => name !== VEGGIES_CATEGORY_NAME);
  const names =
    sectionOrder.includes(VEGGIES_CATEGORY_NAME) === false
      ? withoutVeggies
      : [VEGGIES_CATEGORY_NAME, ...withoutVeggies];
  return names.map((name, index) => ({
    name,
    sortRank: name === VEGGIES_CATEGORY_NAME ? VEGGIES_SORT_RANK : index,
  }));
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  } else {
    return text;
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      continue;
    } else {
      field += char;
    }
  }
  if (inQuotes === false && (field !== "" || row.length > 0)) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
