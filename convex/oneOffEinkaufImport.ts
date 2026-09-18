import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { VEGGIES_CATEGORY_NAME } from "../domain/models/recipe";
import { normalizeIngredientName } from "../domain/operations/normalizeIngredientName";

export const importCatalog = internalMutation({
  args: {
    categories: v.array(
      v.object({
        name: v.string(),
        sortRank: v.number(),
      }),
    ),
    ingredients: v.array(
      v.object({
        name: v.string(),
        categoryName: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    categoriesCreated: v.number(),
    categoriesUpdated: v.number(),
    ingredientsCreated: v.number(),
    ingredientsSkipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await mergeEnglishVeggiesIntoGemuese(ctx);

    const categoryIds = new Map<string, Id<"ingredientCategories">>();
    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    for (const category of args.categories) {
      const existing = await findCategoryByName(ctx, category.name);
      if (existing === null) {
        const id = await ctx.db.insert("ingredientCategories", {
          name: category.name,
          sortRank: category.sortRank,
        });
        categoryIds.set(category.name, id);
        categoriesCreated += 1;
      } else {
        if (existing.sortRank !== category.sortRank) {
          await ctx.db.patch(existing._id, { sortRank: category.sortRank });
          categoriesUpdated += 1;
        }
        categoryIds.set(category.name, existing._id);
      }
    }

    let ingredientsCreated = 0;
    let ingredientsSkipped = 0;
    for (const ingredient of args.ingredients) {
      const normalizedName = normalizeIngredientName(ingredient.name);
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_normalizedName", (q) => q.eq("normalizedName", normalizedName))
        .first();
      if (existing !== null) {
        ingredientsSkipped += 1;
      } else {
        const categoryId =
          ingredient.categoryName === null ? undefined : categoryIds.get(ingredient.categoryName);
        await ctx.db.insert("ingredients", {
          name: ingredient.name,
          normalizedName,
          ...(categoryId === undefined ? {} : { categoryId }),
        });
        ingredientsCreated += 1;
      }
    }

    return {
      categoriesCreated,
      categoriesUpdated,
      ingredientsCreated,
      ingredientsSkipped,
    };
  },
});

async function findCategoryByName(
  ctx: MutationCtx,
  name: string,
): Promise<Doc<"ingredientCategories"> | null> {
  return await ctx.db
    .query("ingredientCategories")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();
}

async function mergeEnglishVeggiesIntoGemuese(ctx: MutationCtx): Promise<void> {
  const englishVeggies = await findCategoryByName(ctx, "Veggies");
  const gemuese = await findCategoryByName(ctx, VEGGIES_CATEGORY_NAME);
  if (englishVeggies === null) {
    return;
  }
  if (gemuese === null) {
    await ctx.db.patch(englishVeggies._id, { name: VEGGIES_CATEGORY_NAME });
    return;
  }
  if (englishVeggies._id === gemuese._id) {
    return;
  }
  const ingredients = await ctx.db.query("ingredients").collect();
  for (const ingredient of ingredients) {
    if (ingredient.categoryId === englishVeggies._id) {
      await ctx.db.patch(ingredient._id, { categoryId: gemuese._id });
    }
  }
  await ctx.db.delete(englishVeggies._id);
}
