import type { AggregatedIngredient, RecipeIngredientLine } from "../models/recipe";

export function aggregateRecipeIngredients(
  lines: readonly RecipeIngredientLine[],
): AggregatedIngredient[] {
  const byKey = new Map<string, AggregatedIngredient>();
  for (const line of lines) {
    const key = `${line.ingredientId}\0${line.unit}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, {
        ingredientId: line.ingredientId,
        unit: line.unit,
        amount: line.amount,
      });
    } else {
      byKey.set(key, {
        ingredientId: existing.ingredientId,
        unit: existing.unit,
        amount: existing.amount + line.amount,
      });
    }
  }
  return [...byKey.values()];
}
