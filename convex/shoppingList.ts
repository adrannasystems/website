import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { authedUserIdOrThrow } from "./auth";
import { mergeShoppingAdd, sortShoppingList } from "../domain/operations/shoppingList";
import { createShoppingItemNotFoundError, ensureDefaultCategories } from "./recipeHelpers";

const shoppingItemValidator = v.object({
  _id: v.id("shoppingListItems"),
  ingredientId: v.id("ingredients"),
  name: v.string(),
  amount: v.number(),
  unit: v.string(),
  checked: v.boolean(),
  categoryId: v.union(v.id("ingredientCategories"), v.null()),
  categoryName: v.union(v.string(), v.null()),
});

export const list = query({
  args: {},
  returns: v.array(shoppingItemValidator),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const items = await ctx.db.query("shoppingListItems").collect();
    const mapped: {
      _id: Id<"shoppingListItems">;
      ingredientId: Id<"ingredients">;
      name: string;
      amount: number;
      unit: string;
      checked: boolean;
      categoryId: Id<"ingredientCategories"> | null;
      categoryName: string | null;
      categorySortRank: number | null;
    }[] = [];
    for (const item of items) {
      const ingredient = await ctx.db.get(item.ingredientId);
      if (ingredient === null) {
        mapped.push({
          _id: item._id,
          ingredientId: item.ingredientId,
          name: "",
          amount: item.amount,
          unit: item.unit,
          checked: item.checked,
          categoryId: null,
          categoryName: null,
          categorySortRank: null,
        });
      } else {
        const categoryId = ingredient.categoryId;
        const category = categoryId === undefined ? null : await ctx.db.get(categoryId);
        mapped.push({
          _id: item._id,
          ingredientId: item.ingredientId,
          name: ingredient.name,
          amount: item.amount,
          unit: item.unit,
          checked: item.checked,
          categoryId: categoryId ?? null,
          categoryName: category?.name ?? null,
          categorySortRank: category?.sortRank ?? null,
        });
      }
    }
    const byId = new Map<string, (typeof mapped)[number]>(mapped.map((item) => [item._id, item]));
    return sortShoppingList(
      mapped.map((item) => ({
        id: item._id,
        ingredientId: item.ingredientId,
        name: item.name,
        checked: item.checked,
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
          amount: item.amount,
          unit: item.unit,
          checked: item.checked,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
        };
      }
    });
  },
});

export const addFromRecipe = mutation({
  args: {
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        amount: v.number(),
        unit: v.string(),
      }),
    ),
    onlyMissing: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    await ensureDefaultCategories(ctx);
    const existingDocs = await ctx.db.query("shoppingListItems").collect();
    let working: { ingredientId: Id<"ingredients">; unit: string; amount: number }[] =
      existingDocs.map((item) => ({
        ingredientId: item.ingredientId,
        unit: item.unit,
        amount: item.amount,
      }));
    const listedIngredientIds = new Set(existingDocs.map((item) => item.ingredientId));
    for (const item of args.items) {
      if (item.amount <= 0) {
        throw new Error("Amount must be greater than 0");
      } else if (args.onlyMissing && listedIngredientIds.has(item.ingredientId)) {
        continue;
      } else {
        working = mergeShoppingAdd(working, {
          ingredientId: item.ingredientId,
          unit: item.unit,
          amount: item.amount,
        }).map((line) => ({
          ingredientId: line.ingredientId as Id<"ingredients">,
          unit: line.unit,
          amount: line.amount,
        }));
        listedIngredientIds.add(item.ingredientId);
      }
    }

    const existingByKey = new Map<string, (typeof existingDocs)[number]>(
      existingDocs.map((item) => [`${item.ingredientId}\0${item.unit}`, item]),
    );
    for (const line of working) {
      const key = `${line.ingredientId}\0${line.unit}`;
      const existing = existingByKey.get(key);
      if (existing === undefined) {
        await ctx.db.insert("shoppingListItems", {
          ingredientId: line.ingredientId,
          amount: line.amount,
          unit: line.unit,
          checked: false,
        });
      } else if (existing.amount !== line.amount) {
        await ctx.db.patch(existing._id, { amount: line.amount, checked: false });
      }
    }
    return null;
  },
});

export const toggleChecked = mutation({
  args: { itemId: v.id("shoppingListItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authedUserIdOrThrow(ctx);
    const item = await ctx.db.get(args.itemId);
    if (item === null) {
      throw createShoppingItemNotFoundError();
    } else {
      await ctx.db.patch(args.itemId, { checked: !item.checked });
      return null;
    }
  },
});

export const clearChecked = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await authedUserIdOrThrow(ctx);
    const items = await ctx.db.query("shoppingListItems").collect();
    for (const item of items) {
      if (item.checked) {
        await ctx.db.delete(item._id);
      }
    }
    return null;
  },
});
