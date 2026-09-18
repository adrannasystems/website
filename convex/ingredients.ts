import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sortRanksForCategoryOrder } from "../domain/operations/ingredientCategories";
import { authedUserIdOrThrow } from "./auth";
import {
  createCategoryNotFoundError,
  createIngredientNotFoundError,
  ensureDefaultCategories,
  findOrCreateIngredient,
  ingredientReplaceValue,
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

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("ingredients"),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const ingredientId = await findOrCreateIngredient(ctx, args.name);
    return ingredientId;
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

export const renameCategory = mutation({
  args: {
    categoryId: v.id("ingredientCategories"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const name = args.name.trim();
    if (name === "") {
      throw new Error("Category name is required");
    } else {
      const category = await ctx.db.get(args.categoryId);
      if (category === null) {
        throw createCategoryNotFoundError();
      } else if (category.name === name) {
        return null;
      } else {
        const existing = await ctx.db
          .query("ingredientCategories")
          .withIndex("by_name", (q) => q.eq("name", name))
          .unique();
        if (existing !== null) {
          throw new Error("Category name already exists");
        } else {
          await ctx.db.patch(args.categoryId, { name });
          return null;
        }
      }
    }
  },
});

export const reorderCategories = mutation({
  args: { orderedCategoryIds: v.array(v.id("ingredientCategories")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const categories = await ctx.db.query("ingredientCategories").collect();
    const ranks = sortRanksForCategoryOrder(
      categories.map((category) => category._id),
      args.orderedCategoryIds,
    );
    if (ranks === null) {
      throw new Error("Category order does not match existing categories");
    } else {
      for (const category of categories) {
        const sortRank = ranks.get(category._id);
        if (sortRank === undefined) {
          throw new Error("Category order does not match existing categories");
        } else if (category.sortRank !== sortRank) {
          await ctx.db.patch(category._id, { sortRank });
        }
      }
      return null;
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
      const stored = ingredientReplaceValue(ingredient);
      await ctx.db.replace(args.ingredientId, {
        name: stored.name,
        normalizedName: stored.normalizedName,
        ...(stored.manualAmount === undefined ? {} : { manualAmount: stored.manualAmount }),
        ...(stored.haveAmount === undefined ? {} : { haveAmount: stored.haveAmount }),
        ...(stored.parked === undefined ? {} : { parked: stored.parked }),
        ...(stored.checked === undefined ? {} : { checked: stored.checked }),
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
