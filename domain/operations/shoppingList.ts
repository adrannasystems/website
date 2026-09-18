import type { RecipeIngredientLine, ShoppingSortItem } from "../models/recipe";

export type MergeShoppingItem = {
  ingredientId: string;
  unit: string;
  amount: number;
};

export function mergeShoppingAdd(
  existing: readonly MergeShoppingItem[],
  add: MergeShoppingItem,
): MergeShoppingItem[] {
  const index = existing.findIndex(
    (item) => item.ingredientId === add.ingredientId && item.unit === add.unit,
  );
  if (index === -1) {
    return [...existing, add];
  } else {
    return existing.map((item, itemIndex) => {
      if (itemIndex === index) {
        return {
          ingredientId: item.ingredientId,
          unit: item.unit,
          amount: item.amount + add.amount,
        };
      } else {
        return item;
      }
    });
  }
}

export function annotateRecipeIngredientsWithPresence<T extends { ingredientId: string }>(
  recipeIngredients: readonly T[],
  shoppingIngredientIds: readonly string[],
): (T & { onList: boolean })[] {
  const onListIds = new Set(shoppingIngredientIds);
  return recipeIngredients.map((item) => ({
    ...item,
    onList: onListIds.has(item.ingredientId),
  }));
}

export function recipeIngredientLinesAtScale(
  lines: readonly RecipeIngredientLine[],
  factor: number,
): RecipeIngredientLine[] {
  return lines.map((line) => ({
    ingredientId: line.ingredientId,
    unit: line.unit,
    amount: line.amount * factor,
  }));
}

export function sortShoppingList(items: readonly ShoppingSortItem[]): ShoppingSortItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      if (a.checked) {
        return 1;
      } else {
        return -1;
      }
    } else {
      const rankA = a.categorySortRank;
      const rankB = b.categorySortRank;
      if (rankA === null && rankB === null) {
        return a.name.localeCompare(b.name);
      } else if (rankA === null) {
        return 1;
      } else if (rankB === null) {
        return -1;
      } else if (rankA !== rankB) {
        return rankA - rankB;
      } else {
        return a.name.localeCompare(b.name);
      }
    }
  });
}
