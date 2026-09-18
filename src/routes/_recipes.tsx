import * as React from "react";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthButtons, LanguageSwitcher } from "./-header-shared";
import { useLocale } from "@/locale";
import { m } from "@/paraglide/messages.js";
import { RecipesPageShell, LoadingText } from "./-recipes-shared";

export const Route = createFileRoute("/_recipes")({
  component: RecipesLayout,
});

function RecipesLayout() {
  const { locale } = useLocale();
  const location = useLocation();
  const redirectUrl = location.pathname;

  return (
    <>
      <header className="fixed z-10 w-full bg-white shadow-sm" lang={locale}>
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-6">
              <Link to="/recipes" className="text-2xl font-bold text-gray-800">
                {m.recipesBrand()}
              </Link>
              <Authenticated>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <Link
                    to="/recipes"
                    activeOptions={{ exact: true }}
                    className="text-gray-600 hover:text-gray-900"
                    activeProps={{ className: "text-gray-900" }}
                  >
                    {m.recipesNavRecipes()}
                  </Link>
                  <Link
                    to="/recipes/shopping"
                    className="text-gray-600 hover:text-gray-900"
                    activeProps={{ className: "text-gray-900" }}
                  >
                    {m.recipesNavShopping()}
                  </Link>
                </div>
              </Authenticated>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <LanguageSwitcher />
              <AuthLoading>
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              </AuthLoading>
              <Authenticated>
                <UserButton />
              </Authenticated>
              <Unauthenticated>
                <AuthButtons />
              </Unauthenticated>
            </div>
          </div>
        </nav>
      </header>
      <div className="pt-16">
        <AuthLoading>
          <RecipesPageShell>
            <LoadingText />
          </RecipesPageShell>
        </AuthLoading>
        <Authenticated>
          <EnsureDefaultCategories />
          <Outlet />
        </Authenticated>
        <Unauthenticated>
          <RedirectToSignIn redirectUrl={redirectUrl} />
        </Unauthenticated>
      </div>
    </>
  );
}

function EnsureDefaultCategories() {
  const ensureDefaults = useMutation(api.ingredients.ensureDefaults);

  React.useEffect(() => {
    void ensureDefaults({});
  }, [ensureDefaults]);

  return null;
}

function RedirectToSignIn(props: { redirectUrl: string }) {
  const navigate = Route.useNavigate();
  const redirectUrlRef = React.useRef(props.redirectUrl);

  React.useEffect(() => {
    void navigate({
      to: "/sign-in",
      search: { redirect_url: redirectUrlRef.current },
    });
  }, [navigate]);

  return (
    <RecipesPageShell>
      <LoadingText />
    </RecipesPageShell>
  );
}
