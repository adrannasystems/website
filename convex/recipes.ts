import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { authedUserIdOrThrow } from "./auth";
import {
  createStepNotFoundError,
  findOrCreateIngredient,
  recipeReplaceValue,
  requireActiveRecipe,
  requireStep,
} from "./recipeHelpers";

const stepIngredientValidator = v.object({
  _id: v.id("recipeStepIngredients"),
  ingredientId: v.id("ingredients"),
  name: v.string(),
  amount: v.number(),
});

const recipeStepValidator = v.object({
  _id: v.id("recipeSteps"),
  sortOrder: v.number(),
  text: v.string(),
  ingredients: v.array(stepIngredientValidator),
});

const recipeSummaryValidator = v.object({
  _id: v.id("recipes"),
  name: v.string(),
  plannedScale: v.union(v.number(), v.null()),
});

const recipeDetailValidator = v.object({
  _id: v.id("recipes"),
  name: v.string(),
  plannedScale: v.union(v.number(), v.null()),
  steps: v.array(recipeStepValidator),
});

export const list = query({
  args: {},
  returns: v.array(recipeSummaryValidator),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_deletedAt", (q) => q.eq("deletedAt", null))
      .collect();
    return recipes
      .map((recipe) => ({
        _id: recipe._id,
        name: recipe.name,
        plannedScale: recipe.plannedScale ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: { recipeId: v.id("recipes") },
  returns: v.union(recipeDetailValidator, v.null()),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const recipe = await ctx.db.get(args.recipeId);
    if (recipe?.deletedAt !== null) {
      return null;
    } else {
      const steps = await loadRecipeSteps(ctx, recipe._id);
      return {
        _id: recipe._id,
        name: recipe.name,
        plannedScale: recipe.plannedScale ?? null,
        steps,
      };
    }
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("recipes"),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const name = args.name.trim();
    if (name === "") {
      throw new Error("Recipe name is required");
    } else {
      return ctx.db.insert("recipes", { name, deletedAt: null });
    }
  },
});

export const rename = mutation({
  args: { recipeId: v.id("recipes"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireActiveRecipe(ctx, args.recipeId);
    const name = args.name.trim();
    if (name === "") {
      throw new Error("Recipe name is required");
    } else {
      await ctx.db.patch(args.recipeId, { name });
      return null;
    }
  },
});

export const archive = mutation({
  args: { recipeId: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireActiveRecipe(ctx, args.recipeId);
    await ctx.db.patch(args.recipeId, { deletedAt: Date.now() });
    return null;
  },
});

export const setPlannedScale = mutation({
  args: { recipeId: v.id("recipes"), plannedScale: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireActiveRecipe(ctx, args.recipeId);
    if (args.plannedScale <= 0) {
      throw new Error("Scale factor must be greater than 0");
    } else {
      await ctx.db.patch(args.recipeId, { plannedScale: args.plannedScale });
      return null;
    }
  },
});

export const clearPlannedScale = mutation({
  args: { recipeId: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const recipe = await requireActiveRecipe(ctx, args.recipeId);
    const stored = recipeReplaceValue(recipe);
    await ctx.db.replace(args.recipeId, {
      name: stored.name,
      deletedAt: stored.deletedAt,
    });
    return null;
  },
});

export const addStep = mutation({
  args: { recipeId: v.id("recipes"), text: v.optional(v.string()) },
  returns: v.id("recipeSteps"),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireActiveRecipe(ctx, args.recipeId);
    const steps = await ctx.db
      .query("recipeSteps")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    const maxOrder = steps.reduce((max, step) => (step.sortOrder > max ? step.sortOrder : max), -1);
    return ctx.db.insert("recipeSteps", {
      recipeId: args.recipeId,
      sortOrder: maxOrder + 1,
      text: args.text ?? "",
    });
  },
});

export const updateStep = mutation({
  args: { stepId: v.id("recipeSteps"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireStep(ctx, args.stepId);
    await ctx.db.patch(args.stepId, { text: args.text });
    return null;
  },
});

export const deleteStep = mutation({
  args: { stepId: v.id("recipeSteps") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireStep(ctx, args.stepId);
    const lines = await ctx.db
      .query("recipeStepIngredients")
      .withIndex("by_stepId", (q) => q.eq("stepId", args.stepId))
      .collect();
    for (const line of lines) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.delete(args.stepId);
    return null;
  },
});

export const reorderSteps = mutation({
  args: { recipeId: v.id("recipes"), stepIds: v.array(v.id("recipeSteps")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireActiveRecipe(ctx, args.recipeId);
    const steps = await ctx.db
      .query("recipeSteps")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    const requestedIds = new Set(args.stepIds);
    if (requestedIds.size !== steps.length) {
      throw new Error("Step list does not match this recipe");
    } else {
      for (const step of steps) {
        if (!requestedIds.has(step._id)) {
          throw new Error("Step list does not match this recipe");
        }
      }
      for (const [index, stepId] of args.stepIds.entries()) {
        await ctx.db.patch(stepId, { sortOrder: index });
      }
      return null;
    }
  },
});

export const addStepIngredient = mutation({
  args: {
    stepId: v.id("recipeSteps"),
    name: v.string(),
    amount: v.number(),
  },
  returns: v.id("recipeStepIngredients"),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await requireStep(ctx, args.stepId);
    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    } else {
      const ingredientId = await findOrCreateIngredient(ctx, args.name);
      return ctx.db.insert("recipeStepIngredients", {
        stepId: args.stepId,
        ingredientId,
        amount: args.amount,
      });
    }
  },
});

export const updateStepIngredient = mutation({
  args: {
    stepIngredientId: v.id("recipeStepIngredients"),
    name: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const line = await ctx.db.get(args.stepIngredientId);
    if (line === null) {
      throw createStepNotFoundError();
    } else if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    } else {
      const ingredientId = await findOrCreateIngredient(ctx, args.name);
      await ctx.db.replace(args.stepIngredientId, {
        stepId: line.stepId,
        ingredientId,
        amount: args.amount,
      });
      return null;
    }
  },
});

export const removeStepIngredient = mutation({
  args: { stepIngredientId: v.id("recipeStepIngredients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const line = await ctx.db.get(args.stepIngredientId);
    if (line === null) {
      throw createStepNotFoundError();
    } else {
      await ctx.db.delete(args.stepIngredientId);
      return null;
    }
  },
});

async function loadRecipeSteps(ctx: QueryCtx | MutationCtx, recipeId: Id<"recipes">) {
  const steps = await ctx.db
    .query("recipeSteps")
    .withIndex("by_recipeId", (q) => q.eq("recipeId", recipeId))
    .collect();
  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const result: {
    _id: Id<"recipeSteps">;
    sortOrder: number;
    text: string;
    ingredients: {
      _id: Id<"recipeStepIngredients">;
      ingredientId: Id<"ingredients">;
      name: string;
      amount: number;
    }[];
  }[] = [];
  for (const step of sorted) {
    const lines = await ctx.db
      .query("recipeStepIngredients")
      .withIndex("by_stepId", (q) => q.eq("stepId", step._id))
      .collect();
    const ingredients: {
      _id: Id<"recipeStepIngredients">;
      ingredientId: Id<"ingredients">;
      name: string;
      amount: number;
    }[] = [];
    for (const line of lines) {
      const ingredient = await ctx.db.get(line.ingredientId);
      ingredients.push({
        _id: line._id,
        ingredientId: line.ingredientId,
        name: ingredient === null ? "" : ingredient.name,
        amount: line.amount,
      });
    }
    result.push({
      _id: step._id,
      sortOrder: step.sortOrder,
      text: step.text,
      ingredients,
    });
  }
  return result;
}
