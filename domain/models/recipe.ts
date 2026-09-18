export const VEGGIES_CATEGORY_NAME = "Gemüse";
export const VEGGIES_SORT_RANK = 0;

export type RecipeIngredientLine = {
  ingredientId: string;
  amount: number;
};

export type AggregatedIngredient = {
  ingredientId: string;
  amount: number;
};

export type ShoppingSortItem = {
  id: string;
  ingredientId: string;
  name: string;
  toBuy: number;
  categorySortRank: number | null;
};

export type ShoppingGroupItem = {
  toBuy: number;
  categoryId: string | null;
  categoryName: string | null;
};

export type ShoppingCategoryGroup<T extends ShoppingGroupItem> = {
  categoryId: string | null;
  categoryName: string | null;
  items: T[];
};
