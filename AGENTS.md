# AGENTS.md

This file defines guardrails for agentic coding in this repo.

## Required Workflow

- Always inspect the repo state before changes (`rg --files`, `ls`, or `git status`).
- Before introducing a new dependency, external system, or platform integration, read the official docs first and implement from that source of truth.
- Summarize what changed.
- Do not use raw `fetch` for backend calls. Use Convex queries/mutations instead.
- For API queries, check whether results are paginated. If pagination is possible, ask the user how to handle it before implementing.
- `npm run precommit` runs automatically via Stop and pre-push hooks. If it fails, fix all reported errors before responding.
- Before opening a PR, and after making any changes to a PR branch, run `/conform` to apply style guidelines and pass precommit.

## Runtime Validation

- For frontend changes that alter user-visible behavior, run the app and manually verify the affected flow before marking the task done.
- Do not rely on static checks alone (`lint`/`typecheck`) for UI behavior changes.

## External Integration Safety

- For changes involving third-party SDKs or services, validate runtime initialization and fallback behavior.
- Ensure core page functionality remains usable if an integration fails, is delayed, or is unavailable.

## Optional Feature Degradation

- Optional integrations must fail gracefully and must not block primary user workflows.
- Do not introduce persistent warning/error UI for non-critical integration failures unless explicitly required.

## Env + Config Preflight

- For changes relying on environment variables or runtime configuration, define behavior for missing/invalid values and verify it during testing.

## UI Definition of Done

- Include a brief manual verification note for UI work: action performed, expected result, and observed result.
- Confirm no new unexpected error banners/toasts appear in the affected flow.

## Documentation Freshness Policy

- If a user request involves any library, framework, SDK, platform, hosted service, or external system (for example TanStack Start, Render, Convex, Stripe, Supabase, or GitHub APIs), do not rely on memory alone. Re-check the official documentation before implementing.
- Verify the relevant version before implementation. If the project is pinned to a version, follow that version's docs. If the version is not pinned or is unclear, follow the latest stable docs and note the assumption.
- Prefer primary sources (official docs, official migration guides, official API references, and release notes) over third-party tutorials.
- When implementation details are version-sensitive or ambiguous, state the source and version used in your summary.

## Git

- Always use squash merge (`git merge --squash`) when merging branches into main. Never use plain `git merge`, which creates a merge commit.

## Dependencies

- Always pin new dependencies with a caret version (e.g. `^1.2.3`), never `"latest"` or an unbound range.

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

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
