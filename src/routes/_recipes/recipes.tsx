import * as React from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "../../../convex/_generated/dataModel";
import { m } from "@/paraglide/messages.js";
import { ErrorBanner, RecipesPageShell } from "../-recipes-shared";

export const Route = createFileRoute("/_recipes/recipes")({
  component: RecipesIndexPage,
});

function RecipesIndexPage() {
  const recipes = useQuery(api.recipes.list);
  const createRecipe = useMutation(api.recipes.create);
  const archiveRecipe = useMutation(api.recipes.archive);
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = createName.trim();
    if (name === "") {
      setErrorMessage(m.errorRecipeNameRequired());
    } else {
      setIsCreating(true);
      setErrorMessage(null);
      try {
        const recipeId = await createRecipe({ name });
        setIsCreateOpen(false);
        setCreateName("");
        await navigate({ to: "/recipes/$recipeId", params: { recipeId } });
      } catch {
        setErrorMessage(m.errorCreateRecipe());
      } finally {
        setIsCreating(false);
      }
    }
  }

  async function handleArchive(recipeId: Id<"recipes">) {
    setArchivingId(recipeId);
    setErrorMessage(null);
    try {
      await archiveRecipe({ recipeId });
    } catch {
      setErrorMessage(m.errorArchiveRecipe());
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <RecipesPageShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{m.recipesTitle()}</h1>
        <Button
          type="button"
          onClick={() => {
            setIsCreateOpen(true);
            setErrorMessage(null);
          }}
        >
          {m.recipesAdd()}
        </Button>
      </div>

      {errorMessage === null ? null : (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {recipes === undefined ? (
          <p className="px-4 py-6 text-gray-600">{m.loading()}</p>
        ) : recipes.length === 0 ? (
          <p className="px-4 py-6 text-gray-600">{m.recipesEmpty()}</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recipes.map((recipe) => (
              <li
                key={recipe._id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: recipe._id }}
                  className="text-base font-medium text-gray-900 hover:underline"
                >
                  {recipe.name}
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  disabled={archivingId === recipe._id}
                  onClick={() => {
                    void handleArchive(recipe._id);
                  }}
                >
                  {archivingId === recipe._id ? m.recipesArchiving() : m.recipesArchive()}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setErrorMessage(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.recipesCreateTitle()}</DialogTitle>
            <DialogDescription>{m.recipesCreateDescription()}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={(event) => void handleCreate(event)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipe-name">{m.recipesName()}</Label>
              <Input
                id="recipe-name"
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                }}
                placeholder={m.recipesNamePlaceholder()}
              />
            </div>
            {errorMessage === null ? null : <ErrorBanner message={errorMessage} />}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setErrorMessage(null);
                }}
                disabled={isCreating}
              >
                {m.cancel()}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? m.creating() : m.create()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RecipesPageShell>
  );
}
