export const VEGGIES_CATEGORY_NAME = "Gemüse";
export const VEGGIES_SORT_RANK = 0;

export type RecipeIngredientLine = {
  ingredientId: string;
  unit: string;
  amount: number;
};

export type AggregatedIngredient = {
  ingredientId: string;
  unit: string;
  amount: number;
};

export type ShoppingSortItem = {
  id: string;
  ingredientId: string;
  name: string;
  checked: boolean;
  categorySortRank: number | null;
};
