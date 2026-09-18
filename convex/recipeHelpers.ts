import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { VEGGIES_CATEGORY_NAME, VEGGIES_SORT_RANK } from "../domain/models/recipe";
import { normalizeIngredientName } from "../domain/operations/normalizeIngredientName";

export function createRecipeNotFoundError() {
  return new Error("Recipe not found");
}

export function createStepNotFoundError() {
  return new Error("Recipe step not found");
}

export function createIngredientNotFoundError() {
  return new Error("Ingredient not found");
}

export function createCategoryNotFoundError() {
  return new Error("Category not found");
}

export async function requireRecipe(ctx: QueryCtx | MutationCtx, recipeId: Id<"recipes">) {
  const recipe = await ctx.db.get(recipeId);
  if (recipe === null) {
    throw createRecipeNotFoundError();
  } else {
    return recipe;
  }
}

export async function requireActiveRecipe(ctx: QueryCtx | MutationCtx, recipeId: Id<"recipes">) {
  const recipe = await requireRecipe(ctx, recipeId);
  if (recipe.deletedAt !== null) {
    throw createRecipeNotFoundError();
  } else {
    return recipe;
  }
}

export async function requireStep(ctx: QueryCtx | MutationCtx, stepId: Id<"recipeSteps">) {
  const step = await ctx.db.get(stepId);
  if (step === null) {
    throw createStepNotFoundError();
  } else {
    return step;
  }
}

export async function ensureDefaultCategories(ctx: MutationCtx): Promise<void> {
  const existing = await ctx.db
    .query("ingredientCategories")
    .withIndex("by_name", (q) => q.eq("name", VEGGIES_CATEGORY_NAME))
    .unique();
  if (existing === null) {
    await ctx.db.insert("ingredientCategories", {
      name: VEGGIES_CATEGORY_NAME,
      sortRank: VEGGIES_SORT_RANK,
    });
  }
}

export async function findOrCreateIngredient(
  ctx: MutationCtx,
  name: string,
): Promise<Id<"ingredients">> {
  const normalizedName = normalizeIngredientName(name);
  if (normalizedName === "") {
    throw new Error("Ingredient name is required");
  } else {
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_normalizedName", (q) => q.eq("normalizedName", normalizedName))
      .unique();
    if (existing === null) {
      return ctx.db.insert("ingredients", {
        name: name.trim(),
        normalizedName,
      });
    } else {
      return existing._id;
    }
  }
}

export function ingredientReplaceValue(ingredient: Doc<"ingredients">) {
  return {
    name: ingredient.name,
    normalizedName: ingredient.normalizedName,
    ...(ingredient.categoryId === undefined ? {} : { categoryId: ingredient.categoryId }),
    ...(ingredient.manualAmount === undefined ? {} : { manualAmount: ingredient.manualAmount }),
    ...(ingredient.haveAmount === undefined ? {} : { haveAmount: ingredient.haveAmount }),
    ...(ingredient.checked === undefined ? {} : { checked: ingredient.checked }),
  };
}

export function recipeReplaceValue(recipe: Doc<"recipes">) {
  return {
    name: recipe.name,
    deletedAt: recipe.deletedAt,
    ...(recipe.plannedScale === undefined ? {} : { plannedScale: recipe.plannedScale }),
  };
}
