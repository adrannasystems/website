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

export const Route = createFileRoute("/_recipes/recipes_/$recipeId")({
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { recipeId } = Route.useParams();
  const typedRecipeId = recipeId as Id<"recipes">;
  const recipe = useQuery(api.recipes.get, { recipeId: typedRecipeId });
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
    const scaleFactor = recipe.plannedScale ?? 1;
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
        <ScalePanel key={String(recipe.plannedScale)} recipe={recipe} onError={setErrorMessage} />
        <StepsEditor
          recipe={recipe}
          scaleFactor={scaleFactor}
          catalogNames={catalog?.map((ingredient) => ingredient.name) ?? []}
          onError={setErrorMessage}
        />
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
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Input
          id="recipe-detail-name"
          aria-label={m.recipesName()}
          className="h-11 text-lg md:text-lg"
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

function ScalePanel(props: { recipe: RecipeDetail; onError: (message: string | null) => void }) {
  const setPlannedScale = useMutation(api.recipes.setPlannedScale);
  const clearPlannedScale = useMutation(api.recipes.clearPlannedScale);
  const [scaleInput, setScaleInput] = React.useState(
    props.recipe.plannedScale === null ? "" : String(props.recipe.plannedScale),
  );

  async function persistScale(raw: string) {
    const parsed = parsePositiveNumber(raw);
    try {
      if (parsed === null) {
        if (props.recipe.plannedScale !== null) {
          await clearPlannedScale({ recipeId: props.recipe._id });
        }
      } else if (parsed !== props.recipe.plannedScale) {
        await setPlannedScale({ recipeId: props.recipe._id, plannedScale: parsed });
      }
    } catch {
      props.onError(m.errorUpdateRecipe());
    }
  }

  return (
    <section className="mb-6 flex items-center gap-2">
      <Label htmlFor="scale-factor">{m.recipesScale()}</Label>
      <Input
        id="scale-factor"
        type="number"
        min="0"
        step="any"
        className="w-20"
        value={scaleInput}
        onChange={(event) => {
          setScaleInput(event.target.value);
        }}
        onBlur={(event) => {
          void persistScale(event.target.value);
        }}
      />
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
                      {formatIngredientLine(ingredient.amount * props.scaleFactor, ingredient.name)}
                    </p>
                    <IngredientFields
                      key={`${ingredient._id}-${formatAmount(ingredient.amount)}-${ingredient.name}`}
                      amount={ingredient.amount}
                      name={ingredient.name}
                      catalogNames={props.catalogNames}
                      onSave={(next) => {
                        void updateStepIngredient({
                          stepIngredientId: ingredient._id,
                          name: next.name,
                          amount: next.amount,
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

function IngredientFields(props: {
  amount: number;
  name: string;
  catalogNames: string[];
  onSave: (next: { amount: number; name: string }) => void;
}) {
  const [amount, setAmount] = React.useState(() => formatAmount(props.amount));
  const [name, setName] = React.useState(props.name);
  const listId = React.useId();

  function saveIfValid() {
    const parsedAmount = parsePositiveNumber(amount);
    const trimmedName = name.trim();
    if (
      parsedAmount !== null &&
      trimmedName !== "" &&
      (parsedAmount !== props.amount || trimmedName !== props.name)
    ) {
      props.onSave({ amount: parsedAmount, name: trimmedName });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
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
      <div>
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
  onAdd: (next: { amount: number; name: string }) => void;
}) {
  const [amount, setAmount] = React.useState("");
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
          props.onAdd({ amount: parsedAmount, name: trimmedName });
          setAmount("");
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
