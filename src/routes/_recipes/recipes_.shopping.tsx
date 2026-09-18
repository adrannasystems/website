import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages.js";
import { ErrorBanner, RecipesPageShell, formatIngredientLine } from "../-recipes-shared";
import * as React from "react";

export const Route = createFileRoute("/_recipes/recipes_/shopping")({
  component: ShoppingPage,
});

function ShoppingPage() {
  const items = useQuery(api.shoppingList.list);
  const categories = useQuery(api.ingredients.listCategories);
  const toggleChecked = useMutation(api.shoppingList.toggleChecked);
  const clearChecked = useMutation(api.shoppingList.clearChecked);
  const setCategory = useMutation(api.ingredients.setCategory);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isClearing, setIsClearing] = React.useState(false);

  const hasChecked = items === undefined ? false : items.some((item) => item.checked);

  return (
    <RecipesPageShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{m.shoppingTitle()}</h1>
        <Button
          type="button"
          variant="outline"
          disabled={isClearing || hasChecked === false}
          onClick={() => {
            setIsClearing(true);
            setErrorMessage(null);
            void clearChecked({})
              .catch(() => {
                setErrorMessage(m.errorAddToShopping());
              })
              .finally(() => {
                setIsClearing(false);
              });
          }}
        >
          {m.shoppingClearChecked()}
        </Button>
      </div>
      {errorMessage === null ? null : (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} />
        </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {items === undefined || categories === undefined ? (
          <p className="px-4 py-6 text-gray-600">{m.loading()}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-gray-600">{m.shoppingEmpty()}</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item._id} className="flex flex-col gap-3 px-4 py-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {
                      void toggleChecked({ itemId: item._id }).catch(() => {
                        setErrorMessage(m.errorUpdateRecipe());
                      });
                    }}
                    className="mt-1 size-6 shrink-0 rounded border-gray-300"
                  />
                  <span
                    className={
                      item.checked
                        ? "text-base text-gray-500 line-through"
                        : "text-base text-gray-900"
                    }
                  >
                    {formatIngredientLine(item.amount, item.unit, item.name)}
                  </span>
                </label>
                <div className="flex flex-col gap-1.5 pl-9">
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor={`category-${item._id}`}
                  >
                    {m.shoppingCategory()}
                  </label>
                  <select
                    id={`category-${item._id}`}
                    className="h-11 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={item.categoryId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      const categoryId =
                        value === "" ? null : (value as Id<"ingredientCategories">);
                      void setCategory({ ingredientId: item.ingredientId, categoryId }).catch(
                        () => {
                          setErrorMessage(m.errorUpdateRecipe());
                        },
                      );
                    }}
                  >
                    <option value="">{m.shoppingUncategorized()}</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RecipesPageShell>
  );
}
