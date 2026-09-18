import * as React from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages.js";
import {
  ErrorBanner,
  RecipesPageShell,
  formatAmount,
  formatIngredientLine,
  parsePositiveNumber,
} from "../-recipes-shared";

type RecipeDetail = NonNullable<FunctionReturnType<typeof api.recipes.get>>;
type ShoppingPreview = FunctionReturnType<typeof api.recipes.shoppingPreview>;

export const Route = createFileRoute("/_recipes/recipes_/$recipeId")({
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { recipeId } = Route.useParams();
  const typedRecipeId = recipeId as Id<"recipes">;
  const [scaleInput, setScaleInput] = React.useState("1");
  const scaleFactor = parsePositiveNumber(scaleInput) ?? 1;
  const recipe = useQuery(api.recipes.get, { recipeId: typedRecipeId });
  const preview = useQuery(
    api.recipes.shoppingPreview,
    parsePositiveNumber(scaleInput) === null ? "skip" : { recipeId: typedRecipeId, scaleFactor },
  );
  const catalog = useQuery(api.ingredients.listIngredients);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (recipe === undefined) {
    return (
      <RecipesPageShell>
        <p className="text-gray-600">{m.loading()}</p>
      </RecipesPageShell>
    );
  } else if (recipe === null) {
    return (
      <RecipesPageShell>
        <p className="mb-4 text-gray-800">{m.recipesNotFound()}</p>
        <Link to="/recipes" className="text-sm font-medium text-blue-700 hover:underline">
          {m.recipesBack()}
        </Link>
      </RecipesPageShell>
    );
  } else {
    return (
      <RecipesPageShell>
        <Link
          to="/recipes"
          className="mb-4 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          {m.recipesBack()}
        </Link>
        {errorMessage === null ? null : (
          <div className="mb-4">
            <ErrorBanner message={errorMessage} />
          </div>
        )}
        <RecipeHeader recipeId={typedRecipeId} name={recipe.name} onError={setErrorMessage} />
        <ScalePanel
          recipe={recipe}
          scaleInput={scaleInput}
          onScaleInputChange={setScaleInput}
          onError={setErrorMessage}
        />
        <StepsEditor
          recipe={recipe}
          scaleFactor={scaleFactor}
          catalogNames={catalog?.map((ingredient) => ingredient.name) ?? []}
          onError={setErrorMessage}
        />
        <ShoppingPanel preview={preview} onError={setErrorMessage} />
      </RecipesPageShell>
    );
  }
}

function RecipeHeader(props: {
  recipeId: Id<"recipes">;
  name: string;
  onError: (message: string | null) => void;
}) {
  const rename = useMutation(api.recipes.rename);
  const archive = useMutation(api.recipes.archive);
  const navigate = useNavigate();
  const [name, setName] = React.useState(props.name);
  const [isArchiving, setIsArchiving] = React.useState(false);

  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="recipe-detail-name">{m.recipesName()}</Label>
        <Input
          id="recipe-detail-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed === "" || trimmed === props.name) {
              setName(props.name);
            } else {
              void rename({ recipeId: props.recipeId, name: trimmed }).catch(() => {
                props.onError(m.errorUpdateRecipe());
              });
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isArchiving}
        onClick={() => {
          setIsArchiving(true);
          void archive({ recipeId: props.recipeId })
            .then(() => navigate({ to: "/recipes" }))
            .catch(() => {
              props.onError(m.errorArchiveRecipe());
              setIsArchiving(false);
            });
        }}
      >
        {isArchiving ? m.recipesArchiving() : m.recipesArchive()}
      </Button>
    </div>
  );
}

function ScalePanel(props: {
  recipe: RecipeDetail;
  scaleInput: string;
  onScaleInputChange: (value: string) => void;
  onError: (message: string | null) => void;
}) {
  const referenceOptions = uniqueReferenceIngredients(props.recipe);
  const [referenceKey, setReferenceKey] = React.useState("");
  const [desiredInput, setDesiredInput] = React.useState("");
  const firstOption = referenceOptions[0];
  const selectedReferenceKey = referenceOptions.some((option) => option.key === referenceKey)
    ? referenceKey
    : (firstOption?.key ?? "");

  return (
    <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{m.recipesScale()}</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scale-factor">{m.recipesScaleFactor()}</Label>
          <Input
            id="scale-factor"
            type="number"
            min="0"
            step="any"
            value={props.scaleInput}
            onChange={(event) => {
              props.onScaleInputChange(event.target.value);
            }}
          />
        </div>
        {referenceOptions.length === 0 ? null : (
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="scale-reference">{m.recipesScaleReference()}</Label>
              <select
                id="scale-reference"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={selectedReferenceKey}
                onChange={(event) => {
                  setReferenceKey(event.target.value);
                }}
              >
                {referenceOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {formatIngredientLine(option.amount, option.unit, option.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scale-desired">{m.recipesScaleDesired()}</Label>
              <Input
                id="scale-desired"
                type="number"
                min="0"
                step="any"
                value={desiredInput}
                onChange={(event) => {
                  setDesiredInput(event.target.value);
                }}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                const option = referenceOptions.find(
                  (candidate) => candidate.key === selectedReferenceKey,
                );
                const desired = parsePositiveNumber(desiredInput);
                if (option === undefined || option.amount === 0 || desired === null) {
                  props.onError(m.errorScaleReference());
                } else {
                  props.onError(null);
                  props.onScaleInputChange((desired / option.amount).toString());
                }
              }}
            >
              {m.recipesApplyScale()}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function StepsEditor(props: {
  recipe: RecipeDetail;
  scaleFactor: number;
  catalogNames: string[];
  onError: (message: string | null) => void;
}) {
  const addStep = useMutation(api.recipes.addStep);
  const updateStep = useMutation(api.recipes.updateStep);
  const deleteStep = useMutation(api.recipes.deleteStep);
  const reorderSteps = useMutation(api.recipes.reorderSteps);
  const addStepIngredient = useMutation(api.recipes.addStepIngredient);
  const updateStepIngredient = useMutation(api.recipes.updateStepIngredient);
  const removeStepIngredient = useMutation(api.recipes.removeStepIngredient);

  async function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= props.recipe.steps.length) {
      return;
    }
    const stepIds = props.recipe.steps.map((step) => step._id);
    const current = stepIds[index];
    const swapWith = stepIds[target];
    if (current === undefined || swapWith === undefined) {
      return;
    }
    stepIds[index] = swapWith;
    stepIds[target] = current;
    try {
      await reorderSteps({ recipeId: props.recipe._id, stepIds });
    } catch {
      props.onError(m.errorUpdateRecipe());
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{m.recipesSteps()}</h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void addStep({ recipeId: props.recipe._id }).catch(() => {
              props.onError(m.errorAddStep());
            });
          }}
        >
          {m.recipesAddStep()}
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {props.recipe.steps.map((step, index) => (
          <article
            key={step._id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-gray-900">{m.recipesStepN({ n: index + 1 })}</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => {
                    void moveStep(index, -1);
                  }}
                >
                  {m.recipesMoveUp()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === props.recipe.steps.length - 1}
                  onClick={() => {
                    void moveStep(index, 1);
                  }}
                >
                  {m.recipesMoveDown()}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    void deleteStep({ stepId: step._id }).catch(() => {
                      props.onError(m.errorUpdateRecipe());
                    });
                  }}
                >
                  {m.recipesRemoveStep()}
                </Button>
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor={`step-text-${step._id}`}>{m.recipesStepText()}</Label>
              <textarea
                id={`step-text-${step._id}`}
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm"
                defaultValue={step.text}
                placeholder={m.recipesStepTextPlaceholder()}
                onBlur={(event) => {
                  if (event.target.value !== step.text) {
                    void updateStep({ stepId: step._id, text: event.target.value }).catch(() => {
                      props.onError(m.errorUpdateRecipe());
                    });
                  }
                }}
              />
            </div>
            <h4 className="mb-2 text-sm font-medium text-gray-800">{m.recipesIngredients()}</h4>
            {step.ingredients.length === 0 ? (
              <p className="mb-3 text-sm text-gray-600">{m.recipesNoIngredients()}</p>
            ) : (
              <ul className="mb-3 flex flex-col gap-3">
                {step.ingredients.map((ingredient) => (
                  <li
                    key={ingredient._id}
                    className="flex flex-col gap-2 rounded-md border border-gray-100 p-2"
                  >
                    <p className="text-sm text-gray-700">
                      {formatIngredientLine(
                        ingredient.amount * props.scaleFactor,
                        ingredient.unit,
                        ingredient.name,
                      )}
                    </p>
                    <IngredientFields
                      key={`${ingredient._id}-${formatAmount(ingredient.amount)}-${ingredient.unit}-${ingredient.name}`}
                      amount={ingredient.amount}
                      unit={ingredient.unit}
                      name={ingredient.name}
                      catalogNames={props.catalogNames}
                      onSave={(next) => {
                        void updateStepIngredient({
                          stepIngredientId: ingredient._id,
                          name: next.name,
                          amount: next.amount,
                          unit: next.unit,
                        }).catch(() => {
                          props.onError(m.errorSaveIngredient());
                        });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void removeStepIngredient({ stepIngredientId: ingredient._id }).catch(
                          () => {
                            props.onError(m.errorUpdateRecipe());
                          },
                        );
                      }}
                    >
                      {m.remove()}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <AddIngredientForm
              catalogNames={props.catalogNames}
              onAdd={(next) => {
                void addStepIngredient({
                  stepId: step._id,
                  name: next.name,
                  amount: next.amount,
                  unit: next.unit,
                }).catch(() => {
                  props.onError(m.errorAddIngredient());
                });
              }}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function ShoppingPanel(props: {
  preview: ShoppingPreview | undefined;
  onError: (message: string | null) => void;
}) {
  const addFromRecipe = useMutation(api.shoppingList.addFromRecipe);
  const [isAdding, setIsAdding] = React.useState(false);

  async function addItems(onlyMissing: boolean) {
    if (props.preview === undefined || props.preview === null) {
      return;
    }
    setIsAdding(true);
    props.onError(null);
    try {
      await addFromRecipe({
        onlyMissing,
        items: props.preview.map((item) => ({
          ingredientId: item.ingredientId,
          amount: item.amount,
          unit: item.unit,
        })),
      });
    } catch {
      props.onError(m.errorAddToShopping());
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{m.recipesShoppingFromRecipe()}</h2>
      {props.preview === undefined ? (
        <p className="text-gray-600">{m.loading()}</p>
      ) : props.preview === null || props.preview.length === 0 ? (
        <p className="text-gray-600">{m.recipesNoIngredients()}</p>
      ) : (
        <>
          <ul className="mb-4 divide-y divide-gray-100">
            {props.preview.map((item) => (
              <li
                key={`${item.ingredientId}-${item.unit}`}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-gray-900">
                  {formatIngredientLine(item.amount, item.unit, item.name)}
                </span>
                <span className={item.onList ? "text-sm text-green-700" : "text-sm text-amber-700"}>
                  {item.onList ? m.recipesOnList() : m.recipesNotOnList()}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={isAdding}
              onClick={() => {
                void addItems(true);
              }}
            >
              {isAdding ? m.recipesAdding() : m.recipesAddMissing()}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isAdding}
              onClick={() => {
                void addItems(false);
              }}
            >
              {m.recipesAddAll()}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function IngredientFields(props: {
  amount: number;
  unit: string;
  name: string;
  catalogNames: string[];
  onSave: (next: { amount: number; unit: string; name: string }) => void;
}) {
  const [amount, setAmount] = React.useState(() => formatAmount(props.amount));
  const [unit, setUnit] = React.useState(props.unit);
  const [name, setName] = React.useState(props.name);
  const listId = React.useId();

  function saveIfValid() {
    const parsedAmount = parsePositiveNumber(amount);
    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    if (
      parsedAmount !== null &&
      trimmedName !== "" &&
      (parsedAmount !== props.amount || trimmedUnit !== props.unit || trimmedName !== props.name)
    ) {
      props.onSave({ amount: parsedAmount, unit: trimmedUnit, name: trimmedName });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      <Input
        aria-label={m.recipesAmount()}
        type="number"
        min="0"
        step="any"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
        onBlur={saveIfValid}
      />
      <Input
        aria-label={m.recipesUnit()}
        value={unit}
        onChange={(event) => {
          setUnit(event.target.value);
        }}
        onBlur={saveIfValid}
      />
      <div className="col-span-2 md:col-span-1">
        <Input
          aria-label={m.recipesIngredientName()}
          list={listId}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onBlur={saveIfValid}
        />
        <IngredientDatalist id={listId} names={props.catalogNames} />
      </div>
    </div>
  );
}

function AddIngredientForm(props: {
  catalogNames: string[];
  onAdd: (next: { amount: number; unit: string; name: string }) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [name, setName] = React.useState("");
  const listId = React.useId();

  return (
    <form
      className="flex flex-col gap-2 md:flex-row md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedAmount = parsePositiveNumber(amount);
        const trimmedName = name.trim();
        if (parsedAmount !== null && trimmedName !== "") {
          props.onAdd({ amount: parsedAmount, unit: unit.trim(), name: trimmedName });
          setAmount("");
          setUnit("");
          setName("");
        }
      }}
    >
      <Input
        aria-label={m.recipesAmount()}
        type="number"
        min="0"
        step="any"
        placeholder={m.recipesAmount()}
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
      />
      <Input
        aria-label={m.recipesUnit()}
        placeholder={m.recipesUnit()}
        value={unit}
        onChange={(event) => {
          setUnit(event.target.value);
        }}
      />
      <div className="min-w-0 flex-1">
        <Input
          aria-label={m.recipesIngredientName()}
          list={listId}
          placeholder={m.recipesIngredientPlaceholder()}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <IngredientDatalist id={listId} names={props.catalogNames} />
      </div>
      <Button type="submit">{m.recipesAddIngredient()}</Button>
    </form>
  );
}

function IngredientDatalist(props: { id: string; names: string[] }) {
  return (
    <datalist id={props.id}>
      {props.names.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}

function uniqueReferenceIngredients(recipe: RecipeDetail) {
  const seen = new Set<string>();
  const options: { key: string; name: string; amount: number; unit: string }[] = [];
  for (const step of recipe.steps) {
    for (const ingredient of step.ingredients) {
      const key = `${ingredient.ingredientId}\0${ingredient.unit}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          key,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
        });
      }
    }
  }
  return options;
}
