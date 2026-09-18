import type {
  RecipeIngredientLine,
  ShoppingCategoryGroup,
  ShoppingGroupItem,
  ShoppingSortItem,
} from "../models/recipe";

export function amountOrZero(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  } else {
    return value;
  }
}

export function isParked(value: boolean | undefined): boolean {
  return value === true;
}

export function neededAmount(manualAmount: number, plannedAmount: number): number {
  return manualAmount + plannedAmount;
}

export function toBuyAmount(needed: number, haveAmount: number): number {
  return Math.max(0, needed - haveAmount);
}

export function markDoneHave(needed: number): number {
  return needed;
}

export function recipeIngredientLinesAtScale(
  lines: readonly RecipeIngredientLine[],
  factor: number,
): RecipeIngredientLine[] {
  return lines.map((line) => ({
    ingredientId: line.ingredientId,
    amount: line.amount * factor,
  }));
}

export function sortShoppingList(items: readonly ShoppingSortItem[]): ShoppingSortItem[] {
  return [...items].sort((a, b) => {
    const aNeedsBuy = a.toBuy > 0;
    const bNeedsBuy = b.toBuy > 0;
    if (aNeedsBuy !== bNeedsBuy) {
      if (aNeedsBuy) {
        return -1;
      } else {
        return 1;
      }
    } else if (aNeedsBuy && a.parked !== b.parked) {
      if (a.parked) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return compareCategoryThenName(a, b);
    }
  });
}

function compareCategoryThenName(a: ShoppingSortItem, b: ShoppingSortItem): number {
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

export function groupShoppingList<T extends ShoppingGroupItem>(
  items: readonly T[],
): {
  toBuy: ShoppingCategoryGroup<T>[];
  parked: ShoppingCategoryGroup<T>[];
  rest: ShoppingCategoryGroup<T>[];
} {
  const toBuyItems: T[] = [];
  const parkedItems: T[] = [];
  const restItems: T[] = [];
  for (const item of items) {
    if (item.toBuy > 0) {
      if (isParked(item.parked)) {
        parkedItems.push(item);
      } else {
        toBuyItems.push(item);
      }
    } else {
      restItems.push(item);
    }
  }
  return {
    toBuy: groupByAdjacentCategory(toBuyItems),
    parked: groupByAdjacentCategory(parkedItems),
    rest: groupByAdjacentCategory(restItems),
  };
}

function groupByAdjacentCategory<T extends ShoppingGroupItem>(
  items: readonly T[],
): ShoppingCategoryGroup<T>[] {
  const groups: ShoppingCategoryGroup<T>[] = [];
  for (const item of items) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.categoryId === item.categoryId) {
      lastGroup.items.push(item);
    } else {
      groups.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        items: [item],
      });
    }
  }
  return groups;
}
