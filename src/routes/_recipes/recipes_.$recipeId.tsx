import * as React from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
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
type RecipeStep = RecipeDetail["steps"][number];
type RecipeIngredient = RecipeStep["ingredients"][number];

type EditorTarget =
  | { type: "title" }
  | { type: "step"; id: Id<"recipeSteps"> }
  | { type: "ingredient"; id: Id<"recipeStepIngredients"> }
  | { type: "addIngredient"; stepId: Id<"recipeSteps"> };

export const Route = createFileRoute("/_recipes/recipes_/$recipeId")({
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { recipeId } = Route.useParams();
  const typedRecipeId = recipeId as Id<"recipes">;
  const recipe = useQuery(api.recipes.get, { recipeId: typedRecipeId });
  const catalog = useQuery(api.ingredients.listIngredients);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [editor, setEditor] = React.useState<EditorTarget | null>(null);
  const editorRef = React.useRef<EditorTarget | null>(null);
  const commitBlockedRef = React.useRef(false);
  editorRef.current = editor;

  function requestEditor(next: EditorTarget | null) {
    if (next !== null && isSameEditor(editor, next)) {
      return;
    } else if (next !== null && commitBlockedRef.current) {
      return;
    } else if (next === null) {
      commitBlockedRef.current = false;
      setEditor(null);
    } else {
      setEditor(next);
    }
  }

  function closeIfCurrent(target: EditorTarget) {
    if (isSameEditor(editorRef.current, target)) {
      commitBlockedRef.current = false;
      setEditor(null);
    }
  }

  function forceCloseEditor() {
    commitBlockedRef.current = false;
    setEditor(null);
  }

  function markCommitBlocked() {
    commitBlockedRef.current = true;
  }

  function clearCommitBlocked() {
    commitBlockedRef.current = false;
  }

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
        <RecipeHeader
          recipeId={typedRecipeId}
          name={recipe.name}
          isEditing={editor?.type === "title"}
          onRequestEdit={() => {
            requestEditor({ type: "title" });
          }}
          onForceClose={forceCloseEditor}
          onMarkCommitBlocked={markCommitBlocked}
          onSaved={() => {
            closeIfCurrent({ type: "title" });
          }}
          onError={setErrorMessage}
        />
        <ScalePanel key={String(recipe.plannedScale)} recipe={recipe} onError={setErrorMessage} />
        <StepsEditor
          recipe={recipe}
          scaleFactor={scaleFactor}
          catalogNames={catalog?.map((ingredient) => ingredient.name) ?? []}
          editor={editor}
          onRequestEditor={requestEditor}
          onForceCloseEditor={forceCloseEditor}
          onCloseIfCurrent={closeIfCurrent}
          onMarkCommitBlocked={markCommitBlocked}
          onClearCommitBlocked={clearCommitBlocked}
          onError={setErrorMessage}
        />
      </RecipesPageShell>
    );
  }
}

function RecipeHeader(props: {
  recipeId: Id<"recipes">;
  name: string;
  isEditing: boolean;
  onRequestEdit: () => void;
  onForceClose: () => void;
  onMarkCommitBlocked: () => void;
  onSaved: () => void;
  onError: (message: string | null) => void;
}) {
  const archive = useMutation(api.recipes.archive);
  const navigate = useNavigate();
  const [isArchiving, setIsArchiving] = React.useState(false);

  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {props.isEditing ? (
          <TitleEditor
            recipeId={props.recipeId}
            name={props.name}
            onForceClose={props.onForceClose}
            onMarkCommitBlocked={props.onMarkCommitBlocked}
            onSaved={props.onSaved}
            onError={props.onError}
          />
        ) : (
          <div className="flex items-start gap-1">
            <h1 className="min-w-0 flex-1">
              <button
                type="button"
                className="w-full text-left text-2xl font-bold text-gray-900"
                onClick={props.onRequestEdit}
              >
                {props.name}
              </button>
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={m.recipesEdit()}
              onClick={props.onRequestEdit}
            >
              <Pencil />
            </Button>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit shrink-0"
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

function TitleEditor(props: {
  recipeId: Id<"recipes">;
  name: string;
  onForceClose: () => void;
  onMarkCommitBlocked: () => void;
  onSaved: () => void;
  onError: (message: string | null) => void;
}) {
  const rename = useMutation(api.recipes.rename);
  const [draftName, setDraftName] = React.useState(props.name);

  function saveTitle() {
    const trimmed = draftName.trim();
    if (trimmed === "") {
      props.onMarkCommitBlocked();
      props.onError(m.errorRecipeNameRequired());
    } else if (trimmed === props.name) {
      props.onSaved();
    } else {
      void rename({ recipeId: props.recipeId, name: trimmed })
        .then(() => {
          props.onError(null);
          props.onSaved();
        })
        .catch(() => {
          props.onMarkCommitBlocked();
          props.onError(m.errorUpdateRecipe());
        });
    }
  }

  return (
    <Input
      id="recipe-detail-name"
      aria-label={m.recipesName()}
      className="h-10 text-lg md:text-lg"
      autoFocus
      value={draftName}
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onChange={(event) => {
        setDraftName(event.target.value);
      }}
      onBlur={() => {
        saveTitle();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraftName(props.name);
          props.onForceClose();
        }
      }}
    />
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
    <section className="mb-4 flex items-center gap-2">
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
  editor: EditorTarget | null;
  onRequestEditor: (next: EditorTarget | null) => void;
  onForceCloseEditor: () => void;
  onCloseIfCurrent: (target: EditorTarget) => void;
  onMarkCommitBlocked: () => void;
  onClearCommitBlocked: () => void;
  onError: (message: string | null) => void;
}) {
  const addStep = useMutation(api.recipes.addStep);
  const reorderSteps = useMutation(api.recipes.reorderSteps);
  const [optimisticOrder, setOptimisticOrder] = React.useState<Id<"recipeSteps">[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const serverOrder = React.useMemo(
    () => props.recipe.steps.map((step) => step._id),
    [props.recipe.steps],
  );
  const orderedIds = resolveOrderedStepIds(serverOrder, optimisticOrder);
  const orderedSteps = React.useMemo(() => {
    const byId = new Map(props.recipe.steps.map((step) => [step._id, step]));
    return orderedIds.flatMap((id) => {
      const step = byId.get(id);
      return step === undefined ? [] : [step];
    });
  }, [orderedIds, props.recipe.steps]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) {
      return;
    } else {
      const activeId = orderedIds.find((id) => id === active.id);
      const overId = orderedIds.find((id) => id === over.id);
      if (activeId === undefined || overId === undefined) {
        return;
      } else {
        const newOrder = arrayMove(
          orderedIds,
          orderedIds.indexOf(activeId),
          orderedIds.indexOf(overId),
        );
        setOptimisticOrder(newOrder);
        void reorderSteps({ recipeId: props.recipe._id, stepIds: newOrder }).catch(() => {
          setOptimisticOrder(null);
          props.onError(m.errorReorderSteps());
        });
      }
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{m.recipesSteps()}</h2>
      {orderedSteps.length === 0 ? null : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col divide-y divide-gray-200">
              {orderedSteps.map((step) => (
                <SortableStep
                  key={step._id}
                  step={step}
                  scaleFactor={props.scaleFactor}
                  catalogNames={props.catalogNames}
                  editor={props.editor}
                  onRequestEditor={props.onRequestEditor}
                  onForceCloseEditor={props.onForceCloseEditor}
                  onCloseIfCurrent={props.onCloseIfCurrent}
                  onMarkCommitBlocked={props.onMarkCommitBlocked}
                  onClearCommitBlocked={props.onClearCommitBlocked}
                  onError={props.onError}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 w-fit"
        onClick={() => {
          void addStep({ recipeId: props.recipe._id }).catch(() => {
            props.onError(m.errorAddStep());
          });
        }}
      >
        <Plus data-icon="inline-start" />
        {m.recipesAddStep()}
      </Button>
    </section>
  );
}

function SortableStep(props: {
  step: RecipeStep;
  scaleFactor: number;
  catalogNames: string[];
  editor: EditorTarget | null;
  onRequestEditor: (next: EditorTarget | null) => void;
  onForceCloseEditor: () => void;
  onCloseIfCurrent: (target: EditorTarget) => void;
  onMarkCommitBlocked: () => void;
  onClearCommitBlocked: () => void;
  onError: (message: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.step._id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
      className="py-3"
    >
      <StepBlock
        step={props.step}
        scaleFactor={props.scaleFactor}
        catalogNames={props.catalogNames}
        editor={props.editor}
        onRequestEditor={props.onRequestEditor}
        onForceCloseEditor={props.onForceCloseEditor}
        onCloseIfCurrent={props.onCloseIfCurrent}
        onMarkCommitBlocked={props.onMarkCommitBlocked}
        onClearCommitBlocked={props.onClearCommitBlocked}
        onError={props.onError}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function StepBlock(props: {
  step: RecipeStep;
  scaleFactor: number;
  catalogNames: string[];
  editor: EditorTarget | null;
  onRequestEditor: (next: EditorTarget | null) => void;
  onForceCloseEditor: () => void;
  onCloseIfCurrent: (target: EditorTarget) => void;
  onMarkCommitBlocked: () => void;
  onClearCommitBlocked: () => void;
  onError: (message: string | null) => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const updateStep = useMutation(api.recipes.updateStep);
  const deleteStep = useMutation(api.recipes.deleteStep);
  const addStepIngredient = useMutation(api.recipes.addStepIngredient);
  const isEditingStep = props.editor?.type === "step" && props.editor.id === props.step._id;
  const isAddingIngredient =
    props.editor?.type === "addIngredient" && props.editor.stepId === props.step._id;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-label={m.dragToReorder()}
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          {...props.dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>
        <StepText
          step={props.step}
          isEditing={isEditingStep}
          onRequestEdit={() => {
            props.onRequestEditor({ type: "step", id: props.step._id });
          }}
          onForceClose={props.onForceCloseEditor}
          onSaved={() => {
            props.onCloseIfCurrent({ type: "step", id: props.step._id });
          }}
          onSave={(text) => {
            void updateStep({ stepId: props.step._id, text })
              .then(() => {
                props.onError(null);
                props.onCloseIfCurrent({ type: "step", id: props.step._id });
              })
              .catch(() => {
                props.onMarkCommitBlocked();
                props.onError(m.errorUpdateRecipe());
              });
          }}
        />
        {isEditingStep ? (
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="shrink-0"
            aria-label={m.recipesRemoveStep()}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              props.onForceCloseEditor();
              void deleteStep({ stepId: props.step._id }).catch(() => {
                props.onError(m.errorUpdateRecipe());
              });
            }}
          >
            <Trash2 />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={m.recipesEdit()}
            onClick={() => {
              props.onRequestEditor({ type: "step", id: props.step._id });
            }}
          >
            <Pencil />
          </Button>
        )}
        {props.step.ingredients.length === 0 && !isAddingIngredient ? (
          <AddIngredientButton
            onClick={() => {
              props.onRequestEditor({ type: "addIngredient", stepId: props.step._id });
            }}
          />
        ) : null}
      </div>
      {props.step.ingredients.length > 0 || isAddingIngredient ? (
        <ul className="flex flex-col gap-1 pl-8">
          {props.step.ingredients.map((ingredient, index) => (
            <IngredientRow
              key={ingredient._id}
              ingredient={ingredient}
              scaleFactor={props.scaleFactor}
              catalogNames={props.catalogNames}
              isEditing={props.editor?.type === "ingredient" && props.editor.id === ingredient._id}
              onRequestAdd={
                index === props.step.ingredients.length - 1 && !isAddingIngredient
                  ? () => {
                      props.onRequestEditor({ type: "addIngredient", stepId: props.step._id });
                    }
                  : undefined
              }
              onRequestEdit={() => {
                props.onRequestEditor({ type: "ingredient", id: ingredient._id });
              }}
              onForceClose={props.onForceCloseEditor}
              onMarkCommitBlocked={props.onMarkCommitBlocked}
              onCloseIfCurrent={props.onCloseIfCurrent}
              onError={props.onError}
            />
          ))}
          {isAddingIngredient ? (
            <li>
              <AddIngredientForm
                catalogNames={props.catalogNames}
                onAdd={(next) => {
                  void addStepIngredient({
                    stepId: props.step._id,
                    name: next.name,
                    amount: next.amount,
                  })
                    .then(() => {
                      props.onError(null);
                      props.onClearCommitBlocked();
                    })
                    .catch(() => {
                      props.onMarkCommitBlocked();
                      props.onError(m.errorAddIngredient());
                    });
                }}
                onInvalid={() => {
                  props.onMarkCommitBlocked();
                  props.onError(m.errorAddIngredient());
                }}
                onCloseEmpty={props.onForceCloseEditor}
              />
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function StepText(props: {
  step: RecipeStep;
  isEditing: boolean;
  onRequestEdit: () => void;
  onForceClose: () => void;
  onSaved: () => void;
  onSave: (text: string) => void;
}) {
  if (props.isEditing) {
    return (
      <StepTextEditor
        step={props.step}
        onForceClose={props.onForceClose}
        onSaved={props.onSaved}
        onSave={props.onSave}
      />
    );
  } else {
    return (
      <button
        type="button"
        className="min-w-0 flex-1 text-left text-sm text-gray-900"
        onClick={props.onRequestEdit}
      >
        {props.step.text === "" ? (
          <span className="text-gray-500">{m.recipesStepTextPlaceholder()}</span>
        ) : (
          props.step.text
        )}
      </button>
    );
  }
}

function StepTextEditor(props: {
  step: RecipeStep;
  onForceClose: () => void;
  onSaved: () => void;
  onSave: (text: string) => void;
}) {
  const [draftText, setDraftText] = React.useState(props.step.text);

  return (
    <textarea
      id={`step-text-${props.step._id}`}
      aria-label={m.recipesStepText()}
      className="field-sizing-content min-h-8 w-full min-w-0 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      autoFocus
      value={draftText}
      placeholder={m.recipesStepTextPlaceholder()}
      onChange={(event) => {
        setDraftText(event.target.value);
      }}
      onBlur={() => {
        if (draftText === props.step.text) {
          props.onSaved();
        } else {
          props.onSave(draftText);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setDraftText(props.step.text);
          props.onForceClose();
        }
      }}
    />
  );
}

function AddIngredientButton(props: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      aria-label={m.recipesAddIngredient()}
      onClick={props.onClick}
    >
      <Plus />
    </Button>
  );
}

function IngredientRow(props: {
  ingredient: RecipeIngredient;
  scaleFactor: number;
  catalogNames: string[];
  isEditing: boolean;
  onRequestAdd?: () => void;
  onRequestEdit: () => void;
  onForceClose: () => void;
  onMarkCommitBlocked: () => void;
  onCloseIfCurrent: (target: EditorTarget) => void;
  onError: (message: string | null) => void;
}) {
  const updateStepIngredient = useMutation(api.recipes.updateStepIngredient);
  const removeStepIngredient = useMutation(api.recipes.removeStepIngredient);
  const addButton =
    props.onRequestAdd === undefined ? null : <AddIngredientButton onClick={props.onRequestAdd} />;

  if (props.isEditing) {
    return (
      <li className="flex items-center gap-1.5">
        <IngredientFields
          amount={props.ingredient.amount}
          name={props.ingredient.name}
          catalogNames={props.catalogNames}
          onSave={(next) => {
            void updateStepIngredient({
              stepIngredientId: props.ingredient._id,
              name: next.name,
              amount: next.amount,
            })
              .then(() => {
                props.onError(null);
                props.onCloseIfCurrent({ type: "ingredient", id: props.ingredient._id });
              })
              .catch(() => {
                props.onMarkCommitBlocked();
                props.onError(m.errorSaveIngredient());
              });
          }}
          onUnchanged={() => {
            props.onCloseIfCurrent({ type: "ingredient", id: props.ingredient._id });
          }}
          onInvalid={() => {
            props.onMarkCommitBlocked();
            props.onError(m.errorSaveIngredient());
          }}
          onCancel={props.onForceClose}
        />
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          className="shrink-0"
          aria-label={m.remove()}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            props.onForceClose();
            void removeStepIngredient({ stepIngredientId: props.ingredient._id }).catch(() => {
              props.onError(m.errorUpdateRecipe());
            });
          }}
        >
          <X />
        </Button>
        {addButton}
      </li>
    );
  } else {
    return (
      <li className="flex items-center gap-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm text-gray-800"
          onClick={props.onRequestEdit}
        >
          {formatIngredientLine(props.ingredient.amount * props.scaleFactor, props.ingredient.name)}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={m.recipesEdit()}
          onClick={props.onRequestEdit}
        >
          <Pencil />
        </Button>
        {addButton}
      </li>
    );
  }
}

function IngredientFields(props: {
  amount: number;
  name: string;
  catalogNames: string[];
  onSave: (next: { amount: number; name: string }) => void;
  onUnchanged: () => void;
  onInvalid: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = React.useState(() => formatAmount(props.amount));
  const [name, setName] = React.useState(props.name);
  const listId = React.useId();

  function commit() {
    const parsedAmount = parsePositiveNumber(amount);
    const trimmedName = name.trim();
    if (parsedAmount === null || trimmedName === "") {
      props.onInvalid();
    } else if (parsedAmount === props.amount && trimmedName === props.name) {
      props.onUnchanged();
    } else {
      props.onSave({ amount: parsedAmount, name: trimmedName });
    }
  }

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-1.5"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        } else {
          commit();
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <Input
          aria-label={m.recipesIngredientName()}
          list={listId}
          autoFocus
          value={name}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setAmount(formatAmount(props.amount));
              setName(props.name);
              props.onCancel();
            }
          }}
        />
        <IngredientDatalist id={listId} names={props.catalogNames} />
      </div>
      <Input
        aria-label={m.recipesAmount()}
        type="number"
        min="0"
        step="any"
        className="w-24"
        value={amount}
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setAmount(formatAmount(props.amount));
            setName(props.name);
            props.onCancel();
          }
        }}
      />
    </div>
  );
}

function AddIngredientForm(props: {
  catalogNames: string[];
  onAdd: (next: { amount: number; name: string }) => void;
  onInvalid: () => void;
  onCloseEmpty: () => void;
}) {
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [amount, setAmount] = React.useState("");
  const [name, setName] = React.useState("");
  const listId = React.useId();

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedAmount = parsePositiveNumber(amount);
        const trimmedName = name.trim();
        if (parsedAmount === null || trimmedName === "") {
          props.onInvalid();
        } else {
          props.onAdd({ amount: parsedAmount, name: trimmedName });
          setAmount("");
          setName("");
          nameRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        } else if (amount.trim() === "" && name.trim() === "") {
          props.onCloseEmpty();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          props.onCloseEmpty();
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <Input
          ref={nameRef}
          aria-label={m.recipesIngredientName()}
          list={listId}
          autoFocus
          placeholder={m.recipesIngredientPlaceholder()}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <IngredientDatalist id={listId} names={props.catalogNames} />
      </div>
      <Input
        aria-label={m.recipesAmount()}
        type="number"
        min="0"
        step="any"
        className="w-24"
        placeholder={m.recipesAmount()}
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
      />
      <Button type="submit" size="icon-sm" aria-label={m.recipesAddIngredient()}>
        <Plus />
      </Button>
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

function resolveOrderedStepIds(
  serverOrder: Id<"recipeSteps">[],
  optimisticOrder: Id<"recipeSteps">[] | null,
): Id<"recipeSteps">[] {
  if (optimisticOrder === null) {
    return serverOrder;
  } else if (hasSameStepIds(serverOrder, optimisticOrder)) {
    return optimisticOrder;
  } else {
    return serverOrder;
  }
}

function hasSameStepIds(left: Id<"recipeSteps">[], right: Id<"recipeSteps">[]): boolean {
  if (left.length !== right.length) {
    return false;
  } else {
    const rightIds = new Set(right);
    return left.every((id) => rightIds.has(id));
  }
}

function isSameEditor(left: EditorTarget | null, right: EditorTarget | null): boolean {
  if (left === null || right === null) {
    return left === right;
  } else {
    switch (left.type) {
      case "title":
        return right.type === "title";
      case "step":
        return right.type === "step" && left.id === right.id;
      case "ingredient":
        return right.type === "ingredient" && left.id === right.id;
      case "addIngredient":
        return right.type === "addIngredient" && left.stepId === right.stepId;
      default: {
        const exhaustiveCheck: never = left;
        throw new Error(`Unhandled editor: ${String(exhaustiveCheck)}`);
      }
    }
  }
}
