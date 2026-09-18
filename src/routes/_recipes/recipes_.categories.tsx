import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
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
import { GripVertical } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages.js";
import { ErrorBanner, RecipesPageShell } from "../-recipes-shared";

export const Route = createFileRoute("/_recipes/recipes_/categories")({
  component: CategoriesPage,
});

type CategoryRow = {
  _id: Id<"ingredientCategories">;
  name: string;
  sortRank: number;
};

function CategoriesPage() {
  const categories = useQuery(api.ingredients.listCategories);
  const reorderCategories = useMutation(api.ingredients.reorderCategories);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [optimisticOrder, setOptimisticOrder] = React.useState<Id<"ingredientCategories">[] | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const serverOrder = React.useMemo(
    () => (categories === undefined ? [] : categories.map((category) => category._id)),
    [categories],
  );
  const serverOrderKey = serverOrder.join("\0");
  const optimisticOrderKey = optimisticOrder === null ? null : optimisticOrder.join("\0");
  const orderedIds =
    optimisticOrder !== null && optimisticOrderKey !== serverOrderKey
      ? optimisticOrder
      : serverOrder;

  const orderedCategories = React.useMemo(() => {
    if (categories === undefined) {
      return [];
    } else {
      const byId = new Map(categories.map((category) => [category._id, category]));
      return orderedIds.flatMap((id) => {
        const category = byId.get(id);
        return category === undefined ? [] : [category];
      });
    }
  }, [categories, orderedIds]);

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
        void reorderCategories({ orderedCategoryIds: newOrder }).catch(() => {
          setOptimisticOrder(null);
          setErrorMessage(m.errorReorderCategories());
        });
      }
    }
  }

  return (
    <RecipesPageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{m.recipesCategoriesTitle()}</h1>
      </div>

      {errorMessage === null ? null : (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {categories === undefined ? (
          <p className="px-4 py-6 text-gray-600">{m.loading()}</p>
        ) : orderedCategories.length === 0 ? (
          <p className="px-4 py-6 text-gray-600">{m.recipesCategoriesEmpty()}</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-gray-200">
                {orderedCategories.map((category) => (
                  <SortableCategoryRow
                    key={category._id}
                    category={category}
                    onError={setErrorMessage}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </RecipesPageShell>
  );
}

function SortableCategoryRow(props: {
  category: CategoryRow;
  onError: (message: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.category._id,
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
    >
      <CategoryRow
        category={props.category}
        onError={props.onError}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function CategoryRow(props: {
  category: CategoryRow;
  onError: (message: string | null) => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const renameCategory = useMutation(api.ingredients.renameCategory);
  const [isDirty, setIsDirty] = React.useState(false);
  const [draftName, setDraftName] = React.useState(props.category.name);
  const [isSaving, setIsSaving] = React.useState(false);
  const displayedName = isDirty ? draftName : props.category.name;

  async function saveName() {
    const name = displayedName.trim();
    if (name === "") {
      props.onError(m.errorCategoryNameRequired());
      setIsDirty(true);
      setDraftName(displayedName);
    } else if (name === props.category.name) {
      setIsDirty(false);
      setDraftName(props.category.name);
    } else if (!isSaving) {
      setIsSaving(true);
      try {
        await renameCategory({ categoryId: props.category._id, name });
        setIsDirty(false);
        setDraftName(name);
        props.onError(null);
      } catch (error) {
        props.onError(renameErrorMessage(error));
      } finally {
        setIsSaving(false);
      }
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
      <button
        type="button"
        aria-label={m.dragToReorder()}
        className="cursor-grab touch-none rounded p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        {...props.dragHandleProps}
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        value={displayedName}
        aria-label={m.recipesCategoryName()}
        disabled={isSaving}
        onChange={(event) => {
          setIsDirty(true);
          setDraftName(event.target.value);
        }}
        onBlur={() => {
          void saveName();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsDirty(false);
            setDraftName(props.category.name);
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function renameErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "Category name already exists") {
    return m.errorCategoryNameTaken();
  } else if (error instanceof Error && error.message === "Category name is required") {
    return m.errorCategoryNameRequired();
  } else {
    return m.errorRenameCategory();
  }
}
