# AGENTS.md

This file defines guardrails for agentic coding in this repo.

## Required Workflow
- Always inspect the repo state before changes (`rg --files`, `ls`, or `git status`).
- Before introducing a new dependency, external system, or platform integration, read the official docs first and implement from that source of truth.
- Summarize what changed.
- Do not use raw `fetch` for backend calls. Use type-safe server functions or route loaders instead.
- Use TanStack Start environment file conventions: server-only code in `*.server.ts(x)` and client-only code in `*.client.ts(x)`.
- For API queries, check whether results are paginated. If pagination is possible, ask the user how to handle it before implementing.
- Before pushing, run `npm run lint` and `npm run typecheck`, plus any relevant tests, and fix any failures.
- Before telling the user a task is done, always run `npm run lint` and `npm run typecheck` and fix all failures.

## Safety
- Never run destructive commands unless explicitly requested.
- Ask before installing new dependencies or modifying global config.
- Never hard-code secrets (API keys, tokens). Always use environment variables.
- Read required environment variables via named constants and explicit Zod parsing, e.g. `const envVarName = 'X'; const value = z.string({ message: \`${envVarName} is required\` }).nonempty().parse(process.env[envVarName])`.
- Never log secrets or include them in error messages.
- Never silently default missing/invalid data to a "sensible" value.
- For missing/invalid input or API data, explicitly choose: fail parsing or return `undefined`.
- If the correct behavior is unclear, ask before implementing.

## Communication
- Be explicit about assumptions.
- If blocked, propose the smallest next step to unblock.
- Before deciding frontend formatting conventions (dates, numbers, currencies, etc.), ask the user for the preferred format.

## Browser Visual Inspection

A Playwright MCP server is configured in `.mcp.json` at the project root. This gives agents browser
automation tools for visually inspecting the app during development.

### Setup

The MCP server starts automatically when Claude Code loads the project. On first use it will prompt
for approval. Accept it. The server runs `@playwright/mcp@latest` via `npx` — no manual install
needed. If Playwright's browser binaries are missing, run:

```sh
npx playwright install chromium
```

The default viewport is **375×812px** (iPhone-sized), matching the mobile-first design target.

### Workflow for visual changes

1. Start the dev server: `npm run dev` (the MCP server does not start it automatically).
2. Make your HTML/CSS change.
3. Use the Playwright MCP tool to navigate to the relevant page, e.g. `http://localhost:3000`.
4. Take a screenshot to verify the layout looks correct at 375px width.
5. If layout issues are visible, fix them and repeat from step 3.
6. To check a wider breakpoint (tablet/desktop), take an additional screenshot after resizing the
   viewport with the `browser_resize` tool.

### Key tools available

- `browser_navigate` — go to a URL
- `browser_screenshot` — capture the current viewport as an image
- `browser_resize` — change the viewport dimensions (e.g. `1280x800` for desktop)
- `browser_snapshot` — get the accessibility tree (useful for confirming rendered content)

### Mobile-first checklist

- Default screenshots should be at the configured 375px width (no extra steps needed).
- Check that text is readable, tap targets are large enough, and nothing overflows horizontally.
- Verify responsive breakpoints at 768px (tablet) and 1280px (desktop) when relevant.

## Readability
- Prefer clarity over cleverness.
- Do not duplicate near-identical logic across files; extract shared helpers/components when behavior is the same.
- Do not extract a component into a separate file when it is used only once; keep it local to the usage file (as a non-exported helper component if needed for readability).
- Use descriptive names; avoid abbreviations unless standard.
- Keep functions small and focused; extract helpers when logic grows.
- Make control flow visually explicit with `if (...) { ... } else if (...) { ... } else { ... }` when handling decision branches, instead of stacking early returns.
- If appropriate and concise (not long blocks), prefer ternary returns for simple two-way branches: `return <condition> ? <a> : <b>`.
- Avoid complex inline conditionals; use named variables for clarity.
- Add short comments only when intent is non-obvious.
- Order members top-down: exports first, then the members they use, with helpers placed below callers.
- Keep files readable from top to bottom (high-level intent to low-level detail).
- If ordering conflicts with JavaScript/TypeScript hoisting rules, prefer function declarations over const to keep this ordering.
- Avoid single-use local type aliases/interfaces that are only used to annotate one function in the same file.
- Prefer type inference for local return values and intermediate objects when the inferred type is clear.
- Create named types only when reused, exported, or needed to document a non-obvious contract.

## Cursor Cloud specific instructions

### Project overview

This is **Taskologist** (Adranna Systems) — a TanStack Start (React SSR) app with:
- **Convex** cloud backend (real-time DB, auth, crons)
- **Clerk** authentication (server middleware + client provider)
- **PostHog** analytics (client-side)
- **Notion API** integration for one-off tasks (`/tasks` page)

All backend services are cloud-hosted SaaS — no Docker or local databases required.

### Environment variables

A `.env.local` file is needed at the project root. Required variables:

| Variable | Format | Used by |
|---|---|---|
| `VITE_CONVEX_URL` | Valid URL | Client (Convex) |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_<base64>` (Clerk format) | Client (Clerk) |
| `CLERK_SECRET_KEY` | `sk_test_...` | Server (Clerk middleware) |
| `VITE_PUBLIC_POSTHOG_KEY` | Non-empty string | Client (PostHog) |
| `VITE_PUBLIC_POSTHOG_HOST` | Non-empty string | Client (PostHog) |
| `NOTION_TOKEN` | Notion API token | Server (`/tasks` route) |
| `NOTION_DATABASE_ID` | Notion database UUID | Server (`/tasks` route) |
| `CLERK_FRONTEND_API_URL` | Valid URL | Server (Convex auth config, used by `convex dev`) |

Without real API keys, the Vite dev server starts and SSR works, but client-side hydration fails on pages using Clerk/PostHog/Convex. The `/consulting` page renders fully via SSR with placeholder keys.

### Running the dev server

- `npm run dev` — runs both `vite dev` (frontend) and `convex dev` (backend sync) in parallel. Requires a Convex deployment.
- `npm run dev:frontend` — runs only the Vite dev server on port 3000. Use this when you don't have Convex credentials.
- The Clerk publishable key must follow the format `pk_test_<base64(domain$)>` or the server returns 500 on all routes. Generate one with: `echo -n "your.clerk.accounts.dev\$" | base64`.

### Checks (per AGENTS.md Required Workflow)

- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript (two tsconfig passes: client + server)
- `npm run build` — Vite + Nitro production build
