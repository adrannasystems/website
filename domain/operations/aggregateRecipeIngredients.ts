import type { AggregatedIngredient, RecipeIngredientLine } from "../models/recipe";

export function aggregateRecipeIngredients(
  lines: readonly RecipeIngredientLine[],
): AggregatedIngredient[] {
  const byIngredientId = new Map<string, AggregatedIngredient>();
  for (const line of lines) {
    const existing = byIngredientId.get(line.ingredientId);
    if (existing === undefined) {
      byIngredientId.set(line.ingredientId, {
        ingredientId: line.ingredientId,
        amount: line.amount,
      });
    } else {
      byIngredientId.set(line.ingredientId, {
        ingredientId: existing.ingredientId,
        amount: existing.amount + line.amount,
      });
    }
  }
  return [...byIngredientId.values()];
}
