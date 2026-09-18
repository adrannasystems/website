import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authedUserIdOrThrow } from "./auth";
import {
  createCategoryNotFoundError,
  createIngredientNotFoundError,
  ensureDefaultCategories,
} from "./recipeHelpers";

const categoryValidator = v.object({
  _id: v.id("ingredientCategories"),
  name: v.string(),
  sortRank: v.number(),
});

const ingredientValidator = v.object({
  _id: v.id("ingredients"),
  name: v.string(),
  categoryId: v.union(v.id("ingredientCategories"), v.null()),
});

export const listCategories = query({
  args: {},
  returns: v.array(categoryValidator),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const categories = await ctx.db.query("ingredientCategories").collect();
    return categories
      .map((category) => ({
        _id: category._id,
        name: category.name,
        sortRank: category.sortRank,
      }))
      .sort((a, b) => {
        if (a.sortRank !== b.sortRank) {
          return a.sortRank - b.sortRank;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
  },
});

export const listIngredients = query({
  args: {},
  returns: v.array(ingredientValidator),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const ingredients = await ctx.db.query("ingredients").collect();
    return ingredients
      .map((ingredient) => ({
        _id: ingredient._id,
        name: ingredient.name,
        categoryId: ingredient.categoryId ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const ensureDefaults = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    await ensureDefaultCategories(ctx);
    return null;
  },
});

export const createCategory = mutation({
  args: { name: v.string() },
  returns: v.id("ingredientCategories"),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const name = args.name.trim();
    if (name === "") {
      throw new Error("Category name is required");
    } else {
      await ensureDefaultCategories(ctx);
      const existing = await ctx.db
        .query("ingredientCategories")
        .withIndex("by_name", (q) => q.eq("name", name))
        .unique();
      if (existing !== null) {
        return existing._id;
      } else {
        const categories = await ctx.db.query("ingredientCategories").collect();
        const maxRank = categories.reduce(
          (max, category) => (category.sortRank > max ? category.sortRank : max),
          -1,
        );
        return ctx.db.insert("ingredientCategories", {
          name,
          sortRank: maxRank + 1,
        });
      }
    }
  },
});

export const setCategory = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    categoryId: v.union(v.id("ingredientCategories"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    if (ingredient === null) {
      throw createIngredientNotFoundError();
    } else if (args.categoryId === null) {
      await ctx.db.replace(args.ingredientId, {
        name: ingredient.name,
        normalizedName: ingredient.normalizedName,
      });
      return null;
    } else {
      const category = await ctx.db.get(args.categoryId);
      if (category === null) {
        throw createCategoryNotFoundError();
      } else {
        await ctx.db.patch(args.ingredientId, { categoryId: args.categoryId });
        return null;
      }
    }
  },
});
