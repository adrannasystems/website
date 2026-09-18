import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { authedUserIdOrThrow } from "./auth";
import { aggregateRecipeIngredients } from "../domain/operations/aggregateRecipeIngredients";
import {
  amountOrZero,
  isParked,
  markDoneHave,
  neededAmount,
  recipeIngredientLinesAtScale,
  sortShoppingList,
  toBuyAmount,
} from "../domain/operations/shoppingList";
import { createIngredientNotFoundError } from "./recipeHelpers";

const shoppingItemValidator = v.object({
  _id: v.id("ingredients"),
  ingredientId: v.id("ingredients"),
  name: v.string(),
  plannedAmount: v.number(),
  manualAmount: v.number(),
  haveAmount: v.number(),
  needed: v.number(),
  toBuy: v.number(),
  parked: v.boolean(),
  categoryId: v.union(v.id("ingredientCategories"), v.null()),
  categoryName: v.union(v.string(), v.null()),
});

export const list = query({
  args: {},
  returns: v.array(shoppingItemValidator),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const plannedByIngredient = await plannedAmountsByIngredient(ctx);
    const categories = await ctx.db.query("ingredientCategories").collect();
    const categoryById = new Map(categories.map((category) => [category._id, category]));
    const ingredients = await ctx.db.query("ingredients").collect();
    const mapped = ingredients.map((ingredient) => {
      const categoryId = ingredient.categoryId;
      const category = categoryId === undefined ? undefined : categoryById.get(categoryId);
      const plannedAmount = plannedByIngredient.get(ingredient._id) ?? 0;
      const manualAmount = amountOrZero(ingredient.manualAmount);
      const haveAmount = amountOrZero(ingredient.haveAmount);
      const needed = neededAmount(manualAmount, plannedAmount);
      const toBuy = toBuyAmount(needed, haveAmount);
      const parked = isParked(ingredient.parked);
      return {
        _id: ingredient._id,
        ingredientId: ingredient._id,
        name: ingredient.name,
        plannedAmount,
        manualAmount,
        haveAmount,
        needed,
        toBuy,
        parked,
        categoryId: categoryId ?? null,
        categoryName: category === undefined ? null : category.name,
        categorySortRank: category === undefined ? null : category.sortRank,
      };
    });
    const byId = new Map<string, (typeof mapped)[number]>(mapped.map((item) => [item._id, item]));
    return sortShoppingList(
      mapped.map((item) => ({
        id: item._id,
        ingredientId: item.ingredientId,
        name: item.name,
        toBuy: item.toBuy,
        parked: item.parked,
        categorySortRank: item.categorySortRank,
      })),
    ).map((sorted) => {
      const item = byId.get(sorted.id);
      if (item === undefined) {
        throw new Error("Shopping list sort lost an item");
      } else {
        return {
          _id: item._id,
          ingredientId: item.ingredientId,
          name: item.name,
          plannedAmount: item.plannedAmount,
          manualAmount: item.manualAmount,
          haveAmount: item.haveAmount,
          needed: item.needed,
          toBuy: item.toBuy,
          parked: item.parked,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
        };
      }
    });
  },
});

export const setManualAmount = mutation({
  args: { ingredientId: v.id("ingredients"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await patchIngredientAmount(ctx, args.ingredientId, "manualAmount", args.amount);
    return null;
  },
});

export const setHaveAmount = mutation({
  args: { ingredientId: v.id("ingredients"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await patchIngredientAmount(ctx, args.ingredientId, "haveAmount", args.amount);
    return null;
  },
});

export const setParked = mutation({
  args: { ingredientId: v.id("ingredients"), parked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    if (ingredient === null) {
      throw createIngredientNotFoundError();
    } else {
      await ctx.db.patch(args.ingredientId, { parked: args.parked });
      return null;
    }
  },
});

export const markDone = mutation({
  args: { ingredientId: v.id("ingredients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    if (ingredient === null) {
      throw createIngredientNotFoundError();
    } else {
      const plannedByIngredient = await plannedAmountsByIngredient(ctx);
      const plannedAmount = plannedByIngredient.get(args.ingredientId) ?? 0;
      const needed = neededAmount(amountOrZero(ingredient.manualAmount), plannedAmount);
      await ctx.db.patch(args.ingredientId, { haveAmount: markDoneHave(needed) });
      return null;
    }
  },
});

export const startNewShop = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const ingredients = await ctx.db.query("ingredients").collect();
    for (const ingredient of ingredients) {
      if (ingredient.haveAmount !== undefined) {
        await ctx.db.patch(ingredient._id, { haveAmount: 0 });
      }
    }
    return null;
  },
});

async function patchIngredientAmount(
  ctx: MutationCtx,
  ingredientId: Id<"ingredients">,
  field: "manualAmount" | "haveAmount",
  amount: number,
): Promise<void> {
  if (amount < 0) {
    throw new Error("Amount must be at least 0");
  } else {
    const ingredient = await ctx.db.get(ingredientId);
    if (ingredient === null) {
      throw createIngredientNotFoundError();
    } else {
      await ctx.db.patch(ingredientId, { [field]: amount });
    }
  }
}

async function plannedAmountsByIngredient(
  ctx: QueryCtx | MutationCtx,
): Promise<Map<Id<"ingredients">, number>> {
  const recipes = await ctx.db
    .query("recipes")
    .withIndex("by_deletedAt", (q) => q.eq("deletedAt", null))
    .collect();
  const totals = new Map<Id<"ingredients">, number>();
  for (const recipe of recipes) {
    const plannedScale = recipe.plannedScale;
    if (plannedScale === undefined || plannedScale <= 0) {
      continue;
    } else {
      const steps = await ctx.db
        .query("recipeSteps")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      const lines: { ingredientId: Id<"ingredients">; amount: number }[] = [];
      for (const step of steps) {
        const stepLines = await ctx.db
          .query("recipeStepIngredients")
          .withIndex("by_stepId", (q) => q.eq("stepId", step._id))
          .collect();
        for (const line of stepLines) {
          lines.push({ ingredientId: line.ingredientId, amount: line.amount });
        }
      }
      for (const aggregated of aggregateRecipeIngredients(
        recipeIngredientLinesAtScale(lines, plannedScale),
      )) {
        const ingredientId = aggregated.ingredientId as Id<"ingredients">;
        totals.set(ingredientId, (totals.get(ingredientId) ?? 0) + aggregated.amount);
      }
    }
  }
  return totals;
}
