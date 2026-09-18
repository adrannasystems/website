import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { m } from "@/paraglide/messages.js";
import {
  ErrorBanner,
  RecipesPageShell,
  formatAmount,
  parseNonNegativeNumber,
} from "../-recipes-shared";
import { groupShoppingList } from "../../../domain/operations/shoppingList";
import type { ShoppingCategoryGroup } from "../../../domain/models/recipe";
import * as React from "react";

export const Route = createFileRoute("/_recipes/recipes_/shopping")({
  component: ShoppingPage,
});

type ShoppingListItem = {
  _id: Id<"ingredients">;
  ingredientId: Id<"ingredients">;
  name: string;
  plannedAmount: number;
  manualAmount: number;
  haveAmount: number;
  needed: number;
  toBuy: number;
  categoryId: Id<"ingredientCategories"> | null;
  categoryName: string | null;
};

type CategoryOption = {
  _id: Id<"ingredientCategories">;
  name: string;
};

function matchesShoppingFilter(name: string, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed === "") {
    return true;
  } else {
    return name.toLowerCase().includes(trimmed.toLowerCase());
  }
}

const amountInputClassName =
  "h-8 w-full min-w-0 justify-self-end px-1.5 text-right text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const itemGridClassName =
  "grid grid-cols-[1.75rem_repeat(4,minmax(0,1fr))_minmax(6.5rem,auto)] items-center gap-x-1.5 gap-y-1 px-3 py-1.5 sm:grid-cols-[2rem_minmax(0,1fr)_4rem_4rem_4rem_4rem_minmax(8rem,9.5rem)] sm:gap-x-2 sm:py-1";

function ShoppingPage() {
  const items = useQuery(api.shoppingList.list);
  const categories = useQuery(api.ingredients.listCategories);
  const setCategory = useMutation(api.ingredients.setCategory);
  const createIngredient = useMutation(api.ingredients.create);
  const startNewShop = useMutation(api.shoppingList.startNewShop);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [filterText, setFilterText] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [isStartingNewShop, setIsStartingNewShop] = React.useState(false);

  const trimmedQuery = filterText.trim();
  const visibleItems =
    items === undefined
      ? []
      : items.filter((item) => matchesShoppingFilter(item.name, trimmedQuery));
  const grouped = groupShoppingList(visibleItems);
  const canCreate = items !== undefined && trimmedQuery !== "" && visibleItems.length === 0;

  async function handleCreate() {
    if (trimmedQuery === "" || isCreating) {
      return;
    } else {
      setIsCreating(true);
      setErrorMessage(null);
      try {
        await createIngredient({ name: trimmedQuery });
      } catch {
        setErrorMessage(m.errorAddIngredient());
      } finally {
        setIsCreating(false);
      }
    }
  }

  return (
    <RecipesPageShell>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{m.shoppingTitle()}</h1>
          <Button
            type="button"
            variant="outline"
            disabled={isStartingNewShop || items === undefined}
            onClick={() => {
              setIsStartingNewShop(true);
              setErrorMessage(null);
              void startNewShop()
                .catch(() => {
                  setErrorMessage(m.errorUpdateRecipe());
                })
                .finally(() => {
                  setIsStartingNewShop(false);
                });
            }}
          >
            {m.shoppingNewShop()}
          </Button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) {
              void handleCreate();
            }
          }}
        >
          <Input
            type="search"
            value={filterText}
            onChange={(event) => {
              setFilterText(event.target.value);
            }}
            placeholder={m.shoppingFilterPlaceholder()}
            aria-label={m.shoppingFilterPlaceholder()}
            autoComplete="off"
            className="h-11 w-full text-base"
          />
        </form>
      </div>
      {errorMessage === null ? null : (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} />
        </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {items === undefined || categories === undefined ? (
          <p className="px-3 py-6 text-gray-600">{m.loading()}</p>
        ) : canCreate ? (
          <div className="px-3 py-6">
            <Button
              type="button"
              className="h-11 w-full"
              disabled={isCreating}
              onClick={() => {
                void handleCreate();
              }}
            >
              {isCreating ? m.creating() : m.shoppingAddNamed({ name: trimmedQuery })}
            </Button>
          </div>
        ) : visibleItems.length === 0 ? (
          <p className="px-3 py-6 text-gray-600">{m.shoppingEmpty()}</p>
        ) : (
          <div>
            <div className="sticky top-16 z-[1] border-b border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              <p className="sm:hidden">{`${m.shoppingExtra()} · ${m.shoppingPlanned()} · ${m.shoppingHave()} · ${m.shoppingToBuy()}`}</p>
              <div className="hidden grid-cols-[2rem_minmax(0,1fr)_4rem_4rem_4rem_4rem_minmax(8rem,9.5rem)] items-end gap-x-2 sm:grid">
                <span />
                <span className="min-w-0" />
                <span className="truncate text-right" title={m.shoppingExtra()}>
                  {m.shoppingExtra()}
                </span>
                <span className="truncate text-right" title={m.shoppingPlanned()}>
                  {m.shoppingPlanned()}
                </span>
                <span className="truncate text-right" title={m.shoppingHave()}>
                  {m.shoppingHave()}
                </span>
                <span className="truncate text-right" title={m.shoppingToBuy()}>
                  {m.shoppingToBuy()}
                </span>
                <span />
              </div>
            </div>
            <ShoppingSuperSection
              title={m.shoppingToBuy()}
              groups={grouped.toBuy}
              categories={categories}
              muted={false}
              onCategoryChange={(ingredientId, categoryId) => {
                void setCategory({ ingredientId, categoryId }).catch(() => {
                  setErrorMessage(m.errorUpdateRecipe());
                });
              }}
              onError={setErrorMessage}
            />
            <ShoppingSuperSection
              title={m.shoppingRest()}
              groups={grouped.rest}
              categories={categories}
              muted={true}
              onCategoryChange={(ingredientId, categoryId) => {
                void setCategory({ ingredientId, categoryId }).catch(() => {
                  setErrorMessage(m.errorUpdateRecipe());
                });
              }}
              onError={setErrorMessage}
            />
          </div>
        )}
      </div>
    </RecipesPageShell>
  );
}

function ShoppingSuperSection(props: {
  title: string;
  groups: ShoppingCategoryGroup<ShoppingListItem>[];
  categories: CategoryOption[];
  muted: boolean;
  onCategoryChange: (
    ingredientId: Id<"ingredients">,
    categoryId: Id<"ingredientCategories"> | null,
  ) => void;
  onError: (message: string | null) => void;
}) {
  if (props.groups.length === 0) {
    return null;
  } else {
    return (
      <section className={props.muted ? "bg-gray-50" : undefined}>
        <h2
          className={
            props.muted
              ? "px-3 pt-5 pb-1 text-sm font-semibold text-gray-600"
              : "px-3 pt-5 pb-1 text-sm font-semibold text-gray-900"
          }
        >
          {props.title}
        </h2>
        {props.groups.map((group, groupIndex) => (
          <section key={group.categoryId ?? "uncategorized"}>
            <h3
              className={
                groupIndex === 0
                  ? "mt-1 mb-1 px-3 text-xs font-medium text-gray-600"
                  : "mt-4 mb-1 px-3 text-xs font-medium text-gray-600"
              }
            >
              {group.categoryName ?? m.shoppingUncategorized()}
            </h3>
            <ul>
              {group.items.map((item) => (
                <ShoppingItemRow
                  key={item._id}
                  item={item}
                  categories={props.categories}
                  onCategoryChange={props.onCategoryChange}
                  onError={props.onError}
                />
              ))}
            </ul>
          </section>
        ))}
      </section>
    );
  }
}

function ShoppingItemRow(props: {
  item: ShoppingListItem;
  categories: CategoryOption[];
  onCategoryChange: (
    ingredientId: Id<"ingredients">,
    categoryId: Id<"ingredientCategories"> | null,
  ) => void;
  onError: (message: string | null) => void;
}) {
  const item = props.item;
  return (
    <li className={itemGridClassName}>
      <div className="col-start-1 row-start-1 flex h-8 items-center justify-center">
        {item.toBuy > 0 ? (
          <DoneButton ingredientId={item.ingredientId} onError={props.onError} />
        ) : null}
      </div>
      <span
        className="col-span-4 col-start-2 row-start-1 min-w-0 truncate text-sm text-gray-900 sm:col-span-1"
        title={item.name}
      >
        {item.name}
      </span>
      <div className="col-span-6 col-start-1 row-start-2 grid grid-cols-4 items-center gap-x-1.5 sm:contents">
        <div className="sm:col-start-3 sm:row-start-1">
          <ShoppingAmountField
            key={`${item._id}-manual-${formatAmount(item.manualAmount)}`}
            label={m.shoppingExtra()}
            value={item.manualAmount}
            mutation="manual"
            ingredientId={item.ingredientId}
            onError={props.onError}
          />
        </div>
        <span className="h-8 text-right text-sm leading-8 text-gray-600 tabular-nums sm:col-start-4 sm:row-start-1">
          {formatAmount(item.plannedAmount)}
        </span>
        <div className="sm:col-start-5 sm:row-start-1">
          <ShoppingAmountField
            key={`${item._id}-have-${formatAmount(item.haveAmount)}`}
            label={m.shoppingHave()}
            value={item.haveAmount}
            mutation="have"
            ingredientId={item.ingredientId}
            onError={props.onError}
          />
        </div>
        <span
          className={
            item.toBuy > 0
              ? "h-8 text-right text-sm leading-8 font-medium text-gray-900 tabular-nums sm:col-start-6 sm:row-start-1"
              : "h-8 text-right text-sm leading-8 text-gray-400 tabular-nums sm:col-start-6 sm:row-start-1"
          }
        >
          {formatAmount(item.toBuy)}
        </span>
      </div>
      <select
        aria-label={m.shoppingCategory()}
        className="col-start-6 row-start-1 h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-1.5 text-xs sm:col-start-7"
        value={item.categoryId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          const categoryId = value === "" ? null : (value as Id<"ingredientCategories">);
          props.onCategoryChange(item.ingredientId, categoryId);
        }}
      >
        <option value="">{m.shoppingUncategorized()}</option>
        {props.categories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
          </option>
        ))}
      </select>
    </li>
  );
}

function ShoppingAmountField(props: {
  label: string;
  value: number;
  mutation: "manual" | "have";
  ingredientId: Id<"ingredients">;
  onError: (message: string | null) => void;
}) {
  const setManualAmount = useMutation(api.shoppingList.setManualAmount);
  const setHaveAmount = useMutation(api.shoppingList.setHaveAmount);
  const [text, setText] = React.useState(() => formatAmount(props.value));

  return (
    <Input
      id={`${props.mutation}-${props.ingredientId}`}
      type="number"
      min="0"
      step="any"
      inputMode="decimal"
      aria-label={props.label}
      className={amountInputClassName}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={() => {
        const parsed = parseNonNegativeNumber(text);
        if (parsed === null) {
          setText(formatAmount(props.value));
        } else if (parsed !== props.value) {
          const save =
            props.mutation === "manual"
              ? setManualAmount({ ingredientId: props.ingredientId, amount: parsed })
              : setHaveAmount({ ingredientId: props.ingredientId, amount: parsed });
          void save.catch(() => {
            props.onError(m.errorUpdateRecipe());
          });
        }
      }}
    />
  );
}

function DoneButton(props: {
  ingredientId: Id<"ingredients">;
  onError: (message: string | null) => void;
}) {
  const markDone = useMutation(api.shoppingList.markDone);
  const [isSaving, setIsSaving] = React.useState(false);

  return (
    <Button
      type="button"
      size="icon-sm"
      aria-label={m.shoppingDone()}
      disabled={isSaving}
      onClick={() => {
        setIsSaving(true);
        void markDone({ ingredientId: props.ingredientId })
          .catch(() => {
            props.onError(m.errorUpdateRecipe());
          })
          .finally(() => {
            setIsSaving(false);
          });
      }}
    >
      <Check />
    </Button>
  );
}
